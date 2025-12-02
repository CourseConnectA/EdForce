import { IsOptional, IsString, IsUUID, IsBoolean, IsDateString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ContactQueryDto {
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
    description: 'Search term for contact name, email, or phone',
    example: 'john',
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
    description: 'Filter by assigned user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @ApiPropertyOptional({
    description: 'Filter by department',
    example: 'Sales',
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({
    description: 'Filter by lead source',
    example: 'Website',
  })
  @IsOptional()
  @IsString()
  leadSource?: string;

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
    description: 'Filter contacts created after this date',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  createdAfter?: Date;

  @ApiPropertyOptional({
    description: 'Filter contacts created before this date',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  createdBefore?: Date;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'firstName',
    enum: ['firstName', 'lastName', 'title', 'department', 'createdDate', 'modifiedDate'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'firstName';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'ASC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}