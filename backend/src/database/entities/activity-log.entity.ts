import { Entity, Column } from 'typeorm';
import { BaseEntityDB } from './base.entity';

@Entity('activity_log')
export class ActivityLog extends BaseEntityDB {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'target_type', type: 'varchar', length: 100 })
  targetType: string;

  @Column({ name: 'target_id', type: 'uuid' })
  targetId: string;

  @Column({ name: 'action_type', type: 'enum', enum: [
    'CREATE',
    'UPDATE',
    'DELETE',
    'VIEW',
    'LOGIN',
    'LOGOUT'
  ] })
  actionType: string;

  @Column({ name: 'field_name', type: 'varchar', length: 100, nullable: true })
  fieldName: string;

  @Column({ name: 'old_value', type: 'text', nullable: true })
  oldValue: string;

  @Column({ name: 'new_value', type: 'text', nullable: true })
  newValue: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  @Column({ type: 'text', nullable: true })
  description: string;
}