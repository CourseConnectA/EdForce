import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('reports')
@Index('idx_reports_center_scope', ['centerName', 'scope'])
@Index('idx_reports_created_by', ['createdBy'])
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 180 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'folder_id', type: 'uuid', nullable: true })
  folderId: string | null;

  @Column({ name: 'report_type', type: 'varchar', length: 64 })
  reportType: string; // e.g. 'leads', 'lead_history'

  @Column({ type: 'jsonb', nullable: true })
  config: any; // columns, groups, filters, charts, options

  @Column({ type: 'varchar', length: 16, default: 'personal' })
  scope: 'personal' | 'center';

  @Column({ name: 'center_name', type: 'varchar', length: 150, nullable: true })
  centerName: string | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @Column({ name: 'starred_by', type: 'jsonb', nullable: true })
  starredBy: string[] | null; // user ids who starred

  @Column({ name: 'shared_to', type: 'text', array: true, nullable: true })
  sharedTo: string[] | null; // user ids explicitly shared to (in addition to scope)

  @Column({ name: 'excluded_from_center', type: 'text', array: true, nullable: true })
  excludedFromCenter: string[] | null; // user ids excluded when scope='center'

  @CreateDateColumn({ name: 'date_entered' })
  dateEntered: Date;

  @UpdateDateColumn({ name: 'date_modified' })
  dateModified: Date;
}
