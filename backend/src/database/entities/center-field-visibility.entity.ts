import { Entity, PrimaryGeneratedColumn, Column, Unique, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Stores per-center settings for which fields are enabled in:
 * - Filters (filter drawer in leads page)
 * - Columns (manage columns/visible columns in data table)
 * 
 * This allows Center Managers to customize which fields their counselors see.
 */
@Entity('center_field_visibility')
@Unique(['centerName', 'fieldKey'])
export class CenterFieldVisibility {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Center name this setting belongs to
  @Column({ name: 'center_name', type: 'varchar', length: 150 })
  centerName: string;

  // Field key (e.g., 'leadSource', 'industry', 'locationCity')
  @Column({ name: 'field_key', type: 'varchar', length: 128 })
  fieldKey: string;

  // Whether this field is enabled in the filter drawer
  @Column({ name: 'filter_enabled', type: 'boolean', default: true })
  filterEnabled: boolean;

  // Whether this field is enabled in column selection
  @Column({ name: 'column_enabled', type: 'boolean', default: true })
  columnEnabled: boolean;

  @CreateDateColumn({ name: 'date_entered' })
  dateEntered: Date;

  @UpdateDateColumn({ name: 'date_modified' })
  dateModified: Date;
}
