import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity('lead_views')
@Index(['userId', 'name'], { unique: true })
export class LeadView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ name: 'selected_fields', type: 'jsonb', default: () => "'[]'::jsonb" })
  selectedFields: string[]; // e.g., ["referenceNo","firstName","email",...]

  @Column({ name: 'filters', type: 'jsonb', default: () => "'{}'::jsonb" })
  filters: Record<string, any>; // e.g., { leadStatus: 'New', locationState: 'Karnataka' }

  @Column({ name: 'sort_by', type: 'varchar', length: 64, nullable: true })
  sortBy?: string;

  @Column({ name: 'sort_order', type: 'varchar', length: 4, nullable: true })
  sortOrder?: 'ASC' | 'DESC';

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  // Sharing scope: 'personal' (owned by user) or 'center' (shared within user's center)
  @Column({ type: 'varchar', length: 16, default: 'personal' })
  scope: 'personal' | 'center';

  // Center name for center-shared views
  @Column({ name: 'center_name', type: 'varchar', length: 150, nullable: true })
  centerName?: string | null;

  @CreateDateColumn({ name: 'date_entered' })
  dateEntered: Date;

  @UpdateDateColumn({ name: 'date_modified' })
  dateModified: Date;
}
