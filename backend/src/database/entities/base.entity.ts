import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('base_entity')
export abstract class BaseEntityDB {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'date_entered' })
  dateEntered: Date;

  @UpdateDateColumn({ name: 'date_modified' })
  dateModified: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ name: 'modified_by', type: 'uuid', nullable: true })
  modifiedBy: string;

  @Column({ type: 'boolean', default: false })
  deleted: boolean;
}