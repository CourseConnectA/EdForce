import { Entity, PrimaryGeneratedColumn, Column, Unique, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('center_field_options')
@Unique(['centerName', 'fieldKey'])
export class CenterFieldOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_center_field_center_name')
  @Column({ name: 'center_name', type: 'varchar', length: 150 })
  centerName: string;

  @Index('idx_center_field_key')
  @Column({ name: 'field_key', type: 'varchar', length: 128 })
  fieldKey: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  options: string[];

  @CreateDateColumn({ name: 'date_entered' })
  dateEntered: Date;

  @UpdateDateColumn({ name: 'date_modified' })
  dateModified: Date;
}
