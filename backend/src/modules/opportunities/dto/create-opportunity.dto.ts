import { IsString, IsOptional, IsUUID, IsNumber, Min, MinLength, MaxLength, IsEnum, IsDate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateOpportunityDto {
  @ApiProperty({
    description: 'Opportunity name',
    example: 'Enterprise Software Deal',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name: string;

  @ApiProperty({
    description: 'Opportunity amount',
    example: 50000,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({
    description: 'Account ID this opportunity belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiPropertyOptional({
    description: 'Contact ID for primary contact',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional({
    description: 'Sales stage',
    example: 'Prospecting',
    enum: ['Prospecting', 'Qualification', 'Needs Analysis', 'Value Proposition', 'Id. Decision Makers', 'Perception Analysis', 'Proposal/Price Quote', 'Negotiation/Review', 'Closed Won', 'Closed Lost'],
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  salesStage?: string;

  @ApiPropertyOptional({
    description: 'Opportunity type',
    example: 'New Business',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  opportunityType?: string;

  @ApiPropertyOptional({
    description: 'Lead source',
    example: 'Website',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  leadSource?: string;

  @ApiPropertyOptional({
    description: 'Probability of closing (percentage)',
    example: 25,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  probability?: number;

  @ApiPropertyOptional({
    description: 'Expected close date',
    example: '2024-06-30T00:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateClosedExpected?: Date;

  @ApiPropertyOptional({
    description: 'Actual close date',
    example: '2024-06-15T00:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateClosed?: Date;

  @ApiPropertyOptional({
    description: 'Next step',
    example: 'Schedule demo meeting',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nextStep?: string;

  @ApiPropertyOptional({
    description: 'Assigned user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @ApiPropertyOptional({
    description: 'Campaign ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional({
    description: 'Opportunity description',
    example: 'Large enterprise deal for our premium software package',
  })
  @IsOptional()
  @IsString()
  description?: string;
}