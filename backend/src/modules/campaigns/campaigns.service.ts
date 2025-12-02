import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { Campaign, CampaignStatus } from '../../database/entities/campaign.entity';
import { CreateCampaignDto, UpdateCampaignDto, CampaignResponseDto } from './dto/campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
  ) {}

  async create(createCampaignDto: CreateCampaignDto): Promise<CampaignResponseDto> {
    const campaign = this.campaignRepository.create({
      ...createCampaignDto,
      startDate: createCampaignDto.startDate ? new Date(createCampaignDto.startDate) : null,
      endDate: createCampaignDto.endDate ? new Date(createCampaignDto.endDate) : null,
    });

    const savedCampaign = await this.campaignRepository.save(campaign);
    return this.mapToResponseDto(await this.findOne(savedCampaign.id));
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    status?: CampaignStatus;
    type?: string;
    ownerId?: string;
  }): Promise<{ campaigns: CampaignResponseDto[]; total: number; page: number; limit: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    const queryOptions: FindManyOptions<Campaign> = {
      where: {
        deleted: false,
        ...(options?.status && { status: options.status }),
        ...(options?.type && { type: options.type as any }),
        ...(options?.ownerId && { ownerId: options.ownerId }),
      },
      relations: ['owner'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    };

    const [campaigns, total] = await this.campaignRepository.findAndCount(queryOptions);

    return {
      campaigns: campaigns.map(campaign => this.mapToResponseDto(campaign)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id, deleted: false },
      relations: ['owner'],
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    return campaign;
  }

  async update(id: string, updateCampaignDto: UpdateCampaignDto): Promise<CampaignResponseDto> {
    const campaign = await this.findOne(id);

    const updateData = {
      ...updateCampaignDto,
      startDate: updateCampaignDto.startDate ? new Date(updateCampaignDto.startDate) : campaign.startDate,
      endDate: updateCampaignDto.endDate ? new Date(updateCampaignDto.endDate) : campaign.endDate,
    };

    await this.campaignRepository.update(id, updateData);
    return this.mapToResponseDto(await this.findOne(id));
  }

  async remove(id: string): Promise<void> {
    const campaign = await this.findOne(id);
    await this.campaignRepository.update(id, { deleted: true, deletedAt: new Date() });
  }

  async getStats(): Promise<{
    totalCampaigns: number;
    activeCampaigns: number;
    totalBudget: number;
    totalSpent: number;
    campaignsByType: Array<{ type: string; count: number }>;
    campaignsByStatus: Array<{ status: string; count: number }>;
  }> {
    const [
      totalCampaigns,
      activeCampaigns,
      budgetResult,
      spentResult,
      campaignsByType,
      campaignsByStatus,
    ] = await Promise.all([
      this.campaignRepository.count({ where: { deleted: false } }),
      this.campaignRepository.count({ where: { deleted: false, status: CampaignStatus.ACTIVE } }),
      this.campaignRepository
        .createQueryBuilder('campaign')
        .select('SUM(campaign.budget)', 'total')
        .where('campaign.deleted = false')
        .getRawOne(),
      this.campaignRepository
        .createQueryBuilder('campaign')
        .select('SUM(campaign.spent)', 'total')
        .where('campaign.deleted = false')
        .getRawOne(),
      this.campaignRepository
        .createQueryBuilder('campaign')
        .select('campaign.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .where('campaign.deleted = false')
        .groupBy('campaign.type')
        .getRawMany(),
      this.campaignRepository
        .createQueryBuilder('campaign')
        .select('campaign.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('campaign.deleted = false')
        .groupBy('campaign.status')
        .getRawMany(),
    ]);

    return {
      totalCampaigns,
      activeCampaigns,
      totalBudget: parseFloat(budgetResult?.total || '0'),
      totalSpent: parseFloat(spentResult?.total || '0'),
      campaignsByType: campaignsByType.map(item => ({
        type: item.type,
        count: parseInt(item.count, 10),
      })),
      campaignsByStatus: campaignsByStatus.map(item => ({
        status: item.status,
        count: parseInt(item.count, 10),
      })),
    };
  }

  private mapToResponseDto(campaign: Campaign): CampaignResponseDto {
    return {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      type: campaign.type,
      status: campaign.status,
      budget: campaign.budget,
      spent: campaign.spent,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      targetAudience: campaign.targetAudience,
      content: campaign.content,
      metrics: campaign.metrics,
      owner: campaign.owner ? {
        id: campaign.owner.id,
        firstName: campaign.owner.firstName,
        lastName: campaign.owner.lastName,
        email: campaign.owner.email,
      } : undefined,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    };
  }
}