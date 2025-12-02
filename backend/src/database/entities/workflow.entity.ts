import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

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

@Entity('workflows')
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: WorkflowStatus,
    default: WorkflowStatus.DRAFT,
  })
  status: WorkflowStatus;

  @Column({ type: 'jsonb', nullable: false, default: {} })
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

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  statistics: {
    totalRuns?: number;
    successfulRuns?: number;
    failedRuns?: number;
    lastRun?: Date;
    avgExecutionTime?: number;
  };

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @Column({ default: false })
  deleted: boolean;
}