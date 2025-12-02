import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntityDB } from './base.entity';
import { AutomationCampaign } from './automation-campaign.entity';
import { User } from './user.entity';

@Entity('automation_batches')
export class AutomationBatch extends BaseEntityDB {
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ name: 'campaign_id', type: 'uuid', nullable: true })
  campaignId: string | null;

  @ManyToOne(() => AutomationCampaign, { nullable: true })
  @JoinColumn({ name: 'campaign_id' })
  campaign?: AutomationCampaign | null;

  @Column({ name: 'assigned_to_id', type: 'uuid', nullable: true })
  assignedToId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo?: User | null;

  @Column({ type: 'varchar', length: 30, default: 'draft' })
  status: 'draft' | 'assigned' | 'inProgress' | 'completed';
}
