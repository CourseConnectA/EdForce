import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Like, ILike, SelectQueryBuilder } from 'typeorm';
import { Contact } from '../../database/entities/contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactQueryDto } from './dto/contact-query.dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
  ) {}

  async create(createContactDto: CreateContactDto): Promise<Contact> {
    try {
      const contact = this.contactRepository.create(createContactDto);
      return await this.contactRepository.save(contact);
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new BadRequestException('Contact with this email already exists');
      }
      throw error;
    }
  }

  async findAll(query: ContactQueryDto) {
    const { page, limit, search, sortBy, sortOrder, ...filters } = query;
    
    const queryBuilder: SelectQueryBuilder<Contact> = this.contactRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.account', 'account');

    // Apply search
    if (search) {
      queryBuilder.andWhere(
        '(LOWER(contact.firstName) LIKE LOWER(:search) OR LOWER(contact.lastName) LIKE LOWER(:search) OR LOWER(contact.email1) LIKE LOWER(:search) OR LOWER(contact.phoneWork) LIKE LOWER(:search) OR LOWER(contact.phoneMobile) LIKE LOWER(:search))',
        { search: `%${search}%` }
      );
    }

    // Apply filters
    if (filters.accountId) {
      queryBuilder.andWhere('contact.accountId = :accountId', { accountId: filters.accountId });
    }

    if (filters.assignedUserId) {
      queryBuilder.andWhere('contact.assignedUserId = :assignedUserId', { assignedUserId: filters.assignedUserId });
    }

    if (filters.department) {
      queryBuilder.andWhere('LOWER(contact.department) LIKE LOWER(:department)', { 
        department: `%${filters.department}%` 
      });
    }

    if (filters.leadSource) {
      queryBuilder.andWhere('LOWER(contact.leadSource) LIKE LOWER(:leadSource)', { 
        leadSource: `%${filters.leadSource}%` 
      });
    }

    if (filters.emailOptOut !== undefined) {
      queryBuilder.andWhere('contact.emailOptOut = :emailOptOut', { emailOptOut: filters.emailOptOut });
    }

    if (filters.doNotCall !== undefined) {
      queryBuilder.andWhere('contact.doNotCall = :doNotCall', { doNotCall: filters.doNotCall });
    }

    if (filters.createdAfter) {
      queryBuilder.andWhere('contact.dateEntered >= :createdAfter', { createdAfter: filters.createdAfter });
    }

    if (filters.createdBefore) {
      queryBuilder.andWhere('contact.dateEntered <= :createdBefore', { createdBefore: filters.createdBefore });
    }

    // Apply sorting
    const validSortFields = ['firstName', 'lastName', 'title', 'department', 'dateEntered', 'dateModified'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'firstName';
    queryBuilder.orderBy(`contact.${sortField}`, sortOrder);

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [contacts, total] = await queryBuilder.getManyAndCount();

    return {
      data: contacts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Contact> {
    const contact = await this.contactRepository.findOne({
      where: { id },
      relations: ['account'],
    });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    return contact;
  }

  async update(id: string, updateContactDto: UpdateContactDto): Promise<Contact> {
    const contact = await this.findOne(id);
    
    try {
      Object.assign(contact, updateContactDto);
      return await this.contactRepository.save(contact);
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new BadRequestException('Contact with this email already exists');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const contact = await this.findOne(id);
    await this.contactRepository.remove(contact);
  }

  async getContactsByAccount(accountId: string, query: ContactQueryDto) {
    return this.findAll({ ...query, accountId });
  }

  async getContactsByUser(userId: string, query: ContactQueryDto) {
    return this.findAll({ ...query, assignedUserId: userId });
  }

  async getContactStatistics() {
    const queryBuilder = this.contactRepository.createQueryBuilder('contact');

    const [
      totalContacts,
      contactsWithEmail,
      contactsWithPhone,
      contactsByDepartment,
      contactsByLeadSource,
      recentContacts,
    ] = await Promise.all([
      // Total contacts
      queryBuilder.getCount(),

      // Contacts with email
      queryBuilder
        .clone()
        .where('contact.email1 IS NOT NULL AND contact.email1 != \'\'')
        .getCount(),

      // Contacts with phone
      queryBuilder
        .clone()
        .where('(contact.phoneWork IS NOT NULL AND contact.phoneWork != \'\') OR (contact.phoneMobile IS NOT NULL AND contact.phoneMobile != \'\')')
        .getCount(),

      // Contacts by department
      queryBuilder
        .clone()
        .select('contact.department', 'department')
        .addSelect('COUNT(*)', 'count')
        .where('contact.department IS NOT NULL AND contact.department != \'\'')
        .groupBy('contact.department')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany(),

      // Contacts by lead source
      queryBuilder
        .clone()
        .select('contact.leadSource', 'leadSource')
        .addSelect('COUNT(*)', 'count')
        .where('contact.leadSource IS NOT NULL AND contact.leadSource != \'\'')
        .groupBy('contact.leadSource')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany(),

      // Recent contacts (last 30 days)
      queryBuilder
        .clone()
        .where('contact.dateEntered >= :thirtyDaysAgo', { 
          thirtyDaysAgo: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
        })
        .getCount(),
    ]);

    return {
      totalContacts,
      contactsWithEmail,
      contactsWithPhone,
      contactsByDepartment,
      contactsByLeadSource,
      recentContacts,
      emailContactPercentage: totalContacts > 0 ? Math.round((contactsWithEmail / totalContacts) * 100) : 0,
      phoneContactPercentage: totalContacts > 0 ? Math.round((contactsWithPhone / totalContacts) * 100) : 0,
    };
  }

  async searchContacts(searchTerm: string, limit: number = 10) {
    return this.contactRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.account', 'account')
      .where(
        '(LOWER(contact.firstName) LIKE LOWER(:search) OR LOWER(contact.lastName) LIKE LOWER(:search) OR LOWER(contact.email1) LIKE LOWER(:search))',
        { search: `%${searchTerm}%` }
      )
      .orderBy('contact.firstName', 'ASC')
      .limit(limit)
      .getMany();
  }
}