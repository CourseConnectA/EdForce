import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityDB } from './base.entity';
import { Account } from './account.entity';
import { Contact } from './contact.entity';

@Entity('opportunities')
export class Opportunity extends BaseEntityDB {
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @Column({ name: 'contact_id', type: 'uuid', nullable: true })
  contactId: string;

  @Column({ type: 'decimal', precision: 26, scale: 6, nullable: true })
  amount: number;

  @Column({ name: 'date_closed', type: 'date', nullable: true })
  dateClosed: Date;

  @Column({ name: 'date_closed_expected', type: 'date', nullable: true })
  dateClosedExpected: Date;

  @Column({ name: 'sales_stage', type: 'varchar', length: 100, nullable: true, default: 'Prospecting' })
  salesStage: string;

  @Column({ type: 'int', default: 0 })
  probability: number;

  @Column({ name: 'next_step', type: 'varchar', length: 100, nullable: true })
  nextStep: string;

  @Column({ name: 'lead_source', type: 'varchar', length: 100, nullable: true })
  leadSource: string;

  @Column({ name: 'campaign_id', type: 'uuid', nullable: true })
  campaignId: string;

  @Column({ name: 'assigned_user_id', type: 'uuid', nullable: true })
  assignedUserId: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Relations
  @ManyToOne(() => Account, account => account.opportunities)
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @ManyToOne(() => Contact, { nullable: true })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;
}