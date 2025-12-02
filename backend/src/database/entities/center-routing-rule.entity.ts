import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('center_routing_rules')
@Index('idx_crr_center_active', ['centerName', 'isActive'])
export class CenterRoutingRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'center_name', type: 'varchar', length: 150 })
  centerName: string;

  @Column({ name: 'rule_type', type: 'varchar', length: 32 })
  ruleType: 'round_robin' | 'skill_match';

  @Column({ name: 'config', type: 'jsonb', nullable: true })
  config: any;

  @Column({ name: 'active_until', type: 'timestamp', nullable: true })
  activeUntil: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_assigned_user_id', type: 'uuid', nullable: true })
  lastAssignedUserId: string | null;

  @CreateDateColumn({ name: 'date_entered' })
  dateEntered: Date;

  @UpdateDateColumn({ name: 'date_modified' })
  dateModified: Date;
}
