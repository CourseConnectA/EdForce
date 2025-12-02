import { Entity, Column } from 'typeorm';
import { BaseEntityDB } from './base.entity';

@Entity('cases')
export class Case extends BaseEntityDB {
  @Column({ name: 'case_number', type: 'varchar', length: 100, unique: true })
  caseNumber: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ name: 'account_id', type: 'uuid', nullable: true })
  accountId: string;

  @Column({ name: 'contact_id', type: 'uuid', nullable: true })
  contactId: string;

  @Column({ type: 'enum', enum: [
    'Administration',
    'Product',
    'User'
  ], nullable: true })
  type: string;

  @Column({ type: 'enum', enum: [
    'New',
    'Assigned',
    'Closed',
    'Pending Input',
    'Rejected',
    'Duplicate'
  ], default: 'New' })
  status: string;

  @Column({ type: 'enum', enum: [
    'P1',
    'P2',
    'P3'
  ], nullable: true })
  priority: string;

  @Column({ type: 'text', nullable: true })
  resolution: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'assigned_user_id', type: 'uuid', nullable: true })
  assignedUserId: string;
}