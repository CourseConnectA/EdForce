import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityDB } from './base.entity';
import { Lead } from './lead.entity';
import { User } from './user.entity';

@Entity('call_logs')
export class CallLog extends BaseEntityDB {
  @Index()
  @Column({ name: 'lead_id', type: 'uuid' })
  leadId: string;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'phone_number', type: 'varchar', length: 30 })
  phoneNumber: string;

  @Index()
  @Column({ name: 'call_type', type: 'varchar', length: 20 })
  callType: 'outgoing' | 'incoming' | 'missed';

  @Index()
  @Column({ name: 'start_time', type: 'timestamp' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp', nullable: true })
  endTime: Date | null;

  @Column({ name: 'duration', type: 'int', default: 0 })
  duration: number; // seconds

  @Column({ type: 'varchar', length: 50, nullable: true })
  disposition: string | null; // Connected, Not Answered, Busy, Wrong Number, Follow-up Scheduled, etc.

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'boolean', default: false })
  synced: boolean;

  @Column({ name: 'device_call_log_id', type: 'varchar', length: 100, nullable: true })
  deviceCallLogId: string | null; // Android CallLog._ID for deduplication

  @Index()
  @Column({ name: 'center_name', type: 'varchar', length: 150, nullable: true })
  centerName: string | null; // Denormalized for analytics queries
}
