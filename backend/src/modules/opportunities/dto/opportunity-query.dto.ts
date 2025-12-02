import { IsOptional, IsString, IsUUID, IsNumber, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class OpportunityQueryDto {
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
    description: 'Search term for opportunity name or description',
    example: 'enterprise',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by account ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiPropertyOptional({
    description: 'Filter by contact ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional({
    description: 'Filter by assigned user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @ApiPropertyOptional({
    description: 'Filter by sales stage',
    example: 'Prospecting',
    enum: ['Prospecting', 'Qualification', 'Needs Analysis', 'Value Proposition', 'Id. Decision Makers', 'Perception Analysis', 'Proposal/Price Quote', 'Negotiation/Review', 'Closed Won', 'Closed Lost'],
  })
  @IsOptional()
  @IsString()
  salesStage?: string;

  @ApiPropertyOptional({
    description: 'Filter by opportunity type',
    example: 'New Business',
  })
  @IsOptional()
  @IsString()
  opportunityType?: string;

  @ApiPropertyOptional({
    description: 'Filter by lead source',
    example: 'Website',
  })
  @IsOptional()
  @IsString()
  leadSource?: string;

  @ApiPropertyOptional({
    description: 'Filter by minimum amount',
    example: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({
    description: 'Filter by maximum amount',
    example: 100000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @ApiPropertyOptional({
    description: 'Filter opportunities with close date after this date',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  closeDateAfter?: Date;

  @ApiPropertyOptional({
    description: 'Filter opportunities with close date before this date',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  closeDateBefore?: Date;

  @ApiPropertyOptional({
    description: 'Filter opportunities created after this date',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  createdAfter?: Date;

  @ApiPropertyOptional({
    description: 'Filter opportunities created before this date',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  createdBefore?: Date;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'name',
    enum: ['name', 'amount', 'salesStage', 'probability', 'dateClosedExpected', 'createdDate', 'modifiedDate'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdDate';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}