import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AccountQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Search term for account name',
    example: 'Acme',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by account type',
    enum: ['Customer', 'Prospect', 'Partner', 'Reseller', 'Competitor', 'Other'],
  })
  @IsOptional()
  @IsEnum(['Customer', 'Prospect', 'Partner', 'Reseller', 'Competitor', 'Other'])
  accountType?: string;

  @ApiPropertyOptional({
    description: 'Filter by industry',
    example: 'Technology',
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({
    description: 'Filter by rating',
    enum: ['Hot', 'Warm', 'Cold'],
  })
  @IsOptional()
  @IsEnum(['Hot', 'Warm', 'Cold'])
  rating?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'name',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'dateModified';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}