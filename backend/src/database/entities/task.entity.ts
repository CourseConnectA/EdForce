import { Entity, Column } from 'typeorm';
import { BaseEntityDB } from './base.entity';

@Entity('tasks')
export class Task extends BaseEntityDB {
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'enum', enum: [
    'Not Started',
    'In Progress',
    'Completed',
    'Pending Input',
    'Deferred'
  ], default: 'Not Started' })
  status: string;

  @Column({ type: 'enum', enum: [
    'High',
    'Medium',
    'Low'
  ], default: 'Medium' })
  priority: string;

  @Column({ name: 'date_start', type: 'timestamp', nullable: true })
  dateStart: Date;

  @Column({ name: 'date_due', type: 'date', nullable: true })
  dateDue: Date;

  @Column({ name: 'contact_id', type: 'uuid', nullable: true })
  contactId: string;

  @Column({ name: 'parent_type', type: 'varchar', length: 100, nullable: true })
  parentType: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string;

  @Column({ name: 'assigned_user_id', type: 'uuid', nullable: true })
  assignedUserId: string;

  @Column({ type: 'text', nullable: true })
  description: string;
}