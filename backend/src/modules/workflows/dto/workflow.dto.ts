import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsObject, IsNumber } from 'class-validator';
import { WorkflowStatus } from '../../../database/entities/workflow.entity';

export class CreateWorkflowDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;

  @IsObject()
  graph: any;

  @IsOptional()
  @IsNumber()
  version?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  createdBy?: string;
}

export class UpdateWorkflowDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;

  @IsOptional()
  @IsObject()
  graph?: any;

  @IsOptional()
  @IsNumber()
  version?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class WorkflowResponseDto {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  graph: any;
  version: number;
  isActive: boolean;
  statistics?: any;
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class WorkflowExecutionDto {
  @IsObject()
  payload: any;

  @IsOptional()
  @IsString()
  triggerType?: string;
}