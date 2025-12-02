import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityDB } from './base.entity';
import { User } from './user.entity';

@Entity('automation_campaigns')
export class AutomationCampaign extends BaseEntityDB {
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 30, default: 'draft' })
  status: 'draft' | 'active' | 'paused' | 'completed';

  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'owner_id' })
  ownerUser: User;
}
