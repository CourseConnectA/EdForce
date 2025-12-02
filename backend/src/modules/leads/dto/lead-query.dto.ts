import { IsOptional, IsString, IsBoolean, IsDate, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class LeadQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (starts from 1)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Search term for lead name, company, email, or phone',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    example: 'New',
  })
  @IsOptional()
  @IsString()
  leadStatus?: string;

  @ApiPropertyOptional({ description: 'Filter by sub status' })
  @IsOptional()
  @IsString()
  leadSubStatus?: string;

  @ApiPropertyOptional({
    description: 'Filter by lead source',
    example: 'Website',
  })
  @IsOptional()
  @IsString()
  leadSource?: string;

  @ApiPropertyOptional({
    description: 'Filter by industry',
    example: 'Technology',
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ description: 'Filter by city' })
  @IsOptional()
  @IsString()
  locationCity?: string;

  @ApiPropertyOptional({ description: 'Filter by state' })
  @IsOptional()
  @IsString()
  locationState?: string;

  @ApiPropertyOptional({ description: 'Filter by nationality' })
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional({
    description: 'Filter by company name',
    example: 'ABC Corp',
  })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({ description: 'Filter by counselor/assignee user id (UUID)' })
  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @ApiPropertyOptional({ description: 'Alias for assignedUserId (for frontend compatibility)' })
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional({
    description: 'Filter by email opt-out status',
    example: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  emailOptOut?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by do not call status',
    example: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  doNotCall?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by converted status (true for Converted status)',
    example: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  converted?: boolean;

  @ApiPropertyOptional({ description: 'Filter by Important (starred) flag', example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isImportant?: boolean;

  @ApiPropertyOptional({
    description: 'Filter leads created after this date (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  createdAfter?: Date;

  @ApiPropertyOptional({
    description: 'Filter leads created before this date (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  createdBefore?: Date;

  @ApiPropertyOptional({
    description: 'Filter leads converted after this date (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  convertedAfter?: Date;

  @ApiPropertyOptional({
    description: 'Filter leads converted before this date (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  convertedBefore?: Date;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'dateEntered',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'dateEntered';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}