import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityDB } from './base.entity';
import { AutomationCampaign } from './automation-campaign.entity';

@Entity('automation_steps')
export class AutomationStep extends BaseEntityDB {
  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId: string;

  @ManyToOne(() => AutomationCampaign)
  @JoinColumn({ name: 'campaign_id' })
  campaign: AutomationCampaign;

  @Column({ type: 'int' })
  order: number;

  @Column({ type: 'varchar', length: 30 })
  type: 'email' | 'whatsapp' | 'wait';

  @Column({ type: 'jsonb' })
  config: any; // e.g., subject/body or template name, delay, etc.
}
