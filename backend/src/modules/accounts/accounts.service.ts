import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions } from 'typeorm';
import { Account } from '../../database/entities/account.entity';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountQueryDto } from './dto/account-query.dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
  ) {}

  async create(createAccountDto: CreateAccountDto, userId: string): Promise<Account> {
    try {
      const account = this.accountRepository.create({
        ...createAccountDto,
        createdBy: userId,
        modifiedBy: userId,
      });

      return await this.accountRepository.save(account);
    } catch (error) {
      throw new BadRequestException(`Failed to create account: ${error.message}`);
    }
  }

  async findAll(query: AccountQueryDto): Promise<PaginatedResult<Account>> {
    const { page, limit, search, accountType, industry, rating, sortBy, sortOrder } = query;
    
    const queryBuilder = this.accountRepository.createQueryBuilder('account');
    
    // Apply filters
    queryBuilder.where('account.deleted = :deleted', { deleted: false });

    if (search) {
      queryBuilder.andWhere('account.name ILIKE :search', { search: `%${search}%` });
    }

    if (accountType) {
      queryBuilder.andWhere('account.accountType = :accountType', { accountType });
    }

    if (industry) {
      queryBuilder.andWhere('account.industry ILIKE :industry', { industry: `%${industry}%` });
    }

    if (rating) {
      queryBuilder.andWhere('account.rating = :rating', { rating });
    }

    // Apply sorting
    const validSortFields = ['name', 'accountType', 'industry', 'dateEntered', 'dateModified'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'dateModified';
    queryBuilder.orderBy(`account.${sortField}`, sortOrder);

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // Execute query
    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Account> {
    const account = await this.accountRepository.findOne({
      where: { id, deleted: false },
      relations: ['contacts', 'opportunities'],
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    return account;
  }

  async update(id: string, updateAccountDto: UpdateAccountDto, userId: string): Promise<Account> {
    const account = await this.findOne(id);

    try {
      Object.assign(account, updateAccountDto, {
        modifiedBy: userId,
        dateModified: new Date(),
      });

      return await this.accountRepository.save(account);
    } catch (error) {
      throw new BadRequestException(`Failed to update account: ${error.message}`);
    }
  }

  async remove(id: string): Promise<void> {
    const account = await this.findOne(id);

    // Soft delete
    account.deleted = true;
    account.dateModified = new Date();
    
    await this.accountRepository.save(account);
  }

  async getAccountStats(): Promise<any> {
    const stats = await this.accountRepository
      .createQueryBuilder('account')
      .select([
        'COUNT(*) as total',
        'COUNT(CASE WHEN account.accountType = \'Customer\' THEN 1 END) as customers',
        'COUNT(CASE WHEN account.accountType = \'Prospect\' THEN 1 END) as prospects',
        'COUNT(CASE WHEN account.rating = \'Hot\' THEN 1 END) as hotAccounts',
        'AVG(account.annualRevenue) as avgRevenue',
      ])
      .where('account.deleted = :deleted', { deleted: false })
      .getRawOne();

    return {
      total: parseInt(stats.total) || 0,
      customers: parseInt(stats.customers) || 0,
      prospects: parseInt(stats.prospects) || 0,
      hotAccounts: parseInt(stats.hotaccounts) || 0,
      avgRevenue: parseFloat(stats.avgrevenue) || 0,
    };
  }
}