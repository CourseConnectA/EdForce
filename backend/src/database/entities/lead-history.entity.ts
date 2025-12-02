import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';

@Entity('lead_histories')
@Index(['leadId'])
export class LeadHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'lead_id', type: 'uuid' })
  leadId: string;

  @Column({ name: 'action', type: 'varchar', length: 64 })
  action:
    | 'create'
    | 'update'
    | 'status_change'
    | 'sub_status_change'
    | 'owner_change'
    | 'assignment'
    | 'transfer'
    | 'score_change'
    | 'follow_up_change'
    | 'comment'
    | 'import';

  @Column({ name: 'changed_by', type: 'uuid', nullable: true })
  changedBy?: string | null; // user id

  @CreateDateColumn({ name: 'changed_at' })
  changedAt: Date;

  @Column({ name: 'from_value', type: 'jsonb', nullable: true })
  fromValue?: any;

  @Column({ name: 'to_value', type: 'jsonb', nullable: true })
  toValue?: any;

  @Column({ name: 'note', type: 'text', nullable: true })
  note?: string;
}
