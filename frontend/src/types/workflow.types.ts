export interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  graph: {
    nodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data: {
        label: string;
        type: 'trigger' | 'condition' | 'action';
        config?: any;
      };
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      type?: string;
      animated?: boolean;
    }>;
  };
  version: number;
  isActive: boolean;
  statistics?: {
    totalRuns?: number;
    successfulRuns?: number;
    failedRuns?: number;
    lastRun?: Date;
    avgExecutionTime?: number;
  };
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

export enum TriggerType {
  OPPORTUNITY_CREATED = 'opportunity_created',
  OPPORTUNITY_UPDATED = 'opportunity_updated',
  LEAD_CREATED = 'lead_created',
  LEAD_CONVERTED = 'lead_converted',
  ACCOUNT_CREATED = 'account_created',
  CONTACT_CREATED = 'contact_created',
  CAMPAIGN_STARTED = 'campaign_started',
  CUSTOM = 'custom',
}

export enum ActionType {
  SEND_EMAIL = 'send_email',
  SEND_WEBHOOK = 'send_webhook',
  CREATE_TASK = 'create_task',
  UPDATE_FIELD = 'update_field',
  ASSIGN_USER = 'assign_user',
  SEND_NOTIFICATION = 'send_notification',
  CUSTOM = 'custom',
}

export interface CreateWorkflowDto {
  name: string;
  description?: string;
  status?: WorkflowStatus;
  graph: any;
  version?: number;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateWorkflowDto extends Partial<CreateWorkflowDto> {}

export interface WorkflowExecutionDto {
  payload: any;
  triggerType?: string;
}

export interface WorkflowExecutionResult {
  success: boolean;
  logs: string[];
  executionTime: number;
  error?: string;
}