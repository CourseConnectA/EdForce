import { IsEnum, IsOptional, IsString, IsNumber, IsDateString, IsObject, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { CampaignType, CampaignStatus } from '../../../database/entities/campaign.entity';

export class CreateCampaignDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CampaignType)
  type?: CampaignType;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  budget?: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  spent?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsObject()
  targetAudience?: any;

  @IsOptional()
  @IsObject()
  content?: any;

  @IsOptional()
  @IsObject()
  metrics?: any;

  @IsOptional()
  @IsString()
  ownerId?: string;
}

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CampaignType)
  type?: CampaignType;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  budget?: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  spent?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsObject()
  targetAudience?: any;

  @IsOptional()
  @IsObject()
  content?: any;

  @IsOptional()
  @IsObject()
  metrics?: any;

  @IsOptional()
  @IsString()
  ownerId?: string;
}

export class CampaignResponseDto {
  id: string;
  name: string;
  description?: string;
  type: CampaignType;
  status: CampaignStatus;
  budget?: number;
  spent: number;
  startDate?: Date;
  endDate?: Date;
  targetAudience?: any;
  content?: any;
  metrics?: any;
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}