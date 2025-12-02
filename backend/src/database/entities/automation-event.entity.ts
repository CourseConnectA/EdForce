import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityDB } from './base.entity';
import { AutomationCampaign } from './automation-campaign.entity';
import { AutomationBatch } from './automation-batch.entity';
import { AutomationBatchItem } from './automation-batch-item.entity';

@Entity('automation_events')
export class AutomationEvent extends BaseEntityDB {
  @Column({ name: 'campaign_id', type: 'uuid', nullable: true })
  campaignId: string | null;

  @ManyToOne(() => AutomationCampaign, { nullable: true })
  @JoinColumn({ name: 'campaign_id' })
  campaign?: AutomationCampaign | null;

  @Column({ name: 'batch_id', type: 'uuid', nullable: true })
  batchId: string | null;

  @ManyToOne(() => AutomationBatch, { nullable: true })
  @JoinColumn({ name: 'batch_id' })
  batch?: AutomationBatch | null;

  @Column({ name: 'batch_item_id', type: 'uuid', nullable: true })
  batchItemId: string | null;

  @ManyToOne(() => AutomationBatchItem, { nullable: true })
  @JoinColumn({ name: 'batch_item_id' })
  batchItem?: AutomationBatchItem | null;

  @Column({ name: 'lead_id', type: 'uuid', nullable: true })
  leadId: string | null;

  @Column({ type: 'varchar', length: 20 })
  channel: 'email' | 'whatsapp';

  @Column({ type: 'varchar', length: 30 })
  event: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'replied' | 'failed';

  @Column({ type: 'jsonb', nullable: true })
  meta?: any;

  @Column({ name: 'score_delta', type: 'int', default: 0 })
  scoreDelta: number;
}
