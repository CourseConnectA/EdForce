import { Entity, PrimaryGeneratedColumn, Column, Unique, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('lead_field_settings')
@Unique(['key'])
export class LeadFieldSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Lead entity property key, e.g., 'firstName', 'email'
  @Column({ type: 'varchar', length: 128 })
  key: string;

  // Whether the field should be shown in UI
  @Column({ type: 'boolean', default: true })
  visible: boolean;

  // Whether the field is required by business rules (validated in service layer)
  @Column({ type: 'boolean', default: false })
  required: boolean;

  // Optional future scope: per-center toggle
  @Column({ name: 'center_name', type: 'varchar', length: 150, nullable: true })
  centerName?: string | null;

  @CreateDateColumn({ name: 'date_entered' })
  dateEntered: Date;

  @UpdateDateColumn({ name: 'date_modified' })
  dateModified: Date;
}
