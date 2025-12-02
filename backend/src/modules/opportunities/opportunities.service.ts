import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Opportunity } from '../../database/entities/opportunity.entity';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { OpportunityQueryDto } from './dto/opportunity-query.dto';

@Injectable()
export class OpportunitiesService {
  constructor(
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
  ) {}

  async create(createOpportunityDto: CreateOpportunityDto): Promise<Opportunity> {
    try {
      const opportunity = this.opportunityRepository.create(createOpportunityDto);
      const saved = await this.opportunityRepository.save(opportunity);
      // Reload with relations so frontend immediately gets account/contact objects
      return await this.opportunityRepository.findOne({
        where: { id: saved.id },
        relations: ['account', 'contact'],
      });
    } catch (error) {
      throw new BadRequestException('Failed to create opportunity');
    }
  }

  async findAll(query: OpportunityQueryDto) {
    const { page, limit, search, sortBy, sortOrder, ...filters } = query;
    
    const queryBuilder: SelectQueryBuilder<Opportunity> = this.opportunityRepository
      .createQueryBuilder('opportunity')
      .leftJoinAndSelect('opportunity.account', 'account')
      .leftJoinAndSelect('opportunity.contact', 'contact');

    // Apply search
    if (search) {
      queryBuilder.andWhere(
        '(LOWER(opportunity.name) LIKE LOWER(:search) OR LOWER(opportunity.description) LIKE LOWER(:search))',
        { search: `%${search}%` }
      );
    }

    // Apply filters
    if (filters.accountId) {
      queryBuilder.andWhere('opportunity.accountId = :accountId', { accountId: filters.accountId });
    }

    if (filters.contactId) {
      queryBuilder.andWhere('opportunity.contactId = :contactId', { contactId: filters.contactId });
    }

    if (filters.assignedUserId) {
      queryBuilder.andWhere('opportunity.assignedUserId = :assignedUserId', { assignedUserId: filters.assignedUserId });
    }

    if (filters.salesStage) {
      queryBuilder.andWhere('opportunity.salesStage = :salesStage', { salesStage: filters.salesStage });
    }

    if (filters.opportunityType) {
      queryBuilder.andWhere('LOWER(opportunity.opportunityType) LIKE LOWER(:opportunityType)', { 
        opportunityType: `%${filters.opportunityType}%` 
      });
    }

    if (filters.leadSource) {
      queryBuilder.andWhere('LOWER(opportunity.leadSource) LIKE LOWER(:leadSource)', { 
        leadSource: `%${filters.leadSource}%` 
      });
    }

    if (filters.minAmount) {
      queryBuilder.andWhere('opportunity.amount >= :minAmount', { minAmount: filters.minAmount });
    }

    if (filters.maxAmount) {
      queryBuilder.andWhere('opportunity.amount <= :maxAmount', { maxAmount: filters.maxAmount });
    }

    if (filters.closeDateAfter) {
      queryBuilder.andWhere('opportunity.dateClosedExpected >= :closeDateAfter', { closeDateAfter: filters.closeDateAfter });
    }

    if (filters.closeDateBefore) {
      queryBuilder.andWhere('opportunity.dateClosedExpected <= :closeDateBefore', { closeDateBefore: filters.closeDateBefore });
    }

    if (filters.createdAfter) {
      queryBuilder.andWhere('opportunity.dateEntered >= :createdAfter', { createdAfter: filters.createdAfter });
    }

    if (filters.createdBefore) {
      queryBuilder.andWhere('opportunity.dateEntered <= :createdBefore', { createdBefore: filters.createdBefore });
    }

    // Apply sorting
    const validSortFields = ['name', 'amount', 'salesStage', 'probability', 'dateClosed', 'dateEntered', 'dateModified'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'dateEntered';
    queryBuilder.orderBy(`opportunity.${sortField}`, sortOrder);

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [opportunities, total] = await queryBuilder.getManyAndCount();

    return {
      data: opportunities,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Opportunity> {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id },
      relations: ['account', 'contact'],
    });

    if (!opportunity) {
      throw new NotFoundException(`Opportunity with ID ${id} not found`);
    }

    return opportunity;
  }

  async update(id: string, updateOpportunityDto: UpdateOpportunityDto): Promise<Opportunity> {
    const opportunity = await this.findOne(id);
    
    try {
      Object.assign(opportunity, updateOpportunityDto);
      const saved = await this.opportunityRepository.save(opportunity);
      // Return updated entity with relations
      return await this.opportunityRepository.findOne({
        where: { id: saved.id },
        relations: ['account', 'contact'],
      });
    } catch (error) {
      throw new BadRequestException('Failed to update opportunity');
    }
  }

  async remove(id: string): Promise<void> {
    const opportunity = await this.findOne(id);
    await this.opportunityRepository.remove(opportunity);
  }

  async getOpportunityStatistics() {
    const queryBuilder = this.opportunityRepository.createQueryBuilder('opportunity');

    const [
      totalOpportunities,
      totalValue,
      wonOpportunities,
      wonValue,
      opportunitiesByStage,
      opportunitiesBySource,
      avgDealSize,
      thisMonthOpportunities,
    ] = await Promise.all([
      // Total opportunities
      queryBuilder.getCount(),

      // Total pipeline value
      queryBuilder
        .clone()
        .select('SUM(opportunity.amount)', 'total')
        .getRawOne()
        .then(result => Number(result.total) || 0),

      // Won opportunities
      queryBuilder
        .clone()
        .where('opportunity.salesStage = :stage', { stage: 'Closed Won' })
        .getCount(),

      // Won value
      queryBuilder
        .clone()
        .select('SUM(opportunity.amount)', 'total')
        .where('opportunity.salesStage = :stage', { stage: 'Closed Won' })
        .getRawOne()
        .then(result => Number(result.total) || 0),

      // Opportunities by stage
      queryBuilder
        .clone()
        .select('opportunity.salesStage', 'salesStage')
        .addSelect('COUNT(*)', 'count')
        .addSelect('SUM(opportunity.amount)', 'value')
        .where('opportunity.salesStage IS NOT NULL')
        .groupBy('opportunity.salesStage')
        .orderBy('count', 'DESC')
        .getRawMany(),

      // Opportunities by source
      queryBuilder
        .clone()
        .select('opportunity.leadSource', 'leadSource')
        .addSelect('COUNT(*)', 'count')
        .addSelect('SUM(opportunity.amount)', 'value')
        .where('opportunity.leadSource IS NOT NULL AND opportunity.leadSource != \'\'')
        .groupBy('opportunity.leadSource')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany(),

      // Average deal size
      queryBuilder
        .clone()
        .select('AVG(opportunity.amount)', 'average')
        .getRawOne()
        .then(result => Number(result.average) || 0),

      // This month opportunities
      queryBuilder
        .clone()
        .where('opportunity.dateEntered >= :startOfMonth', { 
          startOfMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1) 
        })
        .getCount(),
    ]);

    const winRate = totalOpportunities > 0 ? Math.round((wonOpportunities / totalOpportunities) * 100) : 0;

    return {
      totalOpportunities,
      totalValue,
      wonOpportunities,
      wonValue,
      opportunitiesByStage,
      opportunitiesBySource,
      avgDealSize: Math.round(avgDealSize),
      thisMonthOpportunities,
      winRate,
    };
  }

  async searchOpportunities(searchTerm: string, limit: number = 10) {
    return this.opportunityRepository
      .createQueryBuilder('opportunity')
      .leftJoinAndSelect('opportunity.account', 'account')
      .leftJoinAndSelect('opportunity.contact', 'contact')
      .where(
        '(LOWER(opportunity.name) LIKE LOWER(:search) OR LOWER(opportunity.description) LIKE LOWER(:search))',
        { search: `%${searchTerm}%` }
      )
      .orderBy('opportunity.amount', 'DESC')
      .limit(limit)
      .getMany();
  }
}