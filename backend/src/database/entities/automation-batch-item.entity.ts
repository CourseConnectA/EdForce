import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityDB } from './base.entity';
import { AutomationBatch } from './automation-batch.entity';

@Entity('automation_batch_items')
export class AutomationBatchItem extends BaseEntityDB {
  @Column({ name: 'batch_id', type: 'uuid' })
  batchId: string;

  @ManyToOne(() => AutomationBatch)
  @JoinColumn({ name: 'batch_id' })
  batch: AutomationBatch;

  @Column({ name: 'lead_id', type: 'uuid', nullable: true })
  leadId: string | null;

  @Column({ type: 'jsonb' })
  payload: any; // snapshot of lead/contact fields at the time of export

  @Column({ type: 'varchar', length: 30, default: 'pending' })
  status: 'pending' | 'sent' | 'opened' | 'clicked' | 'replied' | 'failed' | 'stopped';

  @Column({ name: 'assignee_id', type: 'uuid', nullable: true })
  assigneeId: string | null;
}
