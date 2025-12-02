import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityDB } from './base.entity';
import { Account } from './account.entity';

@Entity('contacts')
export class Contact extends BaseEntityDB {
  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({ name: 'account_id', type: 'uuid', nullable: true })
  accountId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  title: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  department: string;

  @Column({ name: 'phone_work', type: 'varchar', length: 100, nullable: true })
  phoneWork: string;

  @Column({ name: 'phone_mobile', type: 'varchar', length: 100, nullable: true })
  phoneMobile: string;

  @Column({ name: 'phone_home', type: 'varchar', length: 100, nullable: true })
  phoneHome: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email1: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email2: string;

  @Column({ name: 'email_opt_out', type: 'boolean', default: false })
  emailOptOut: boolean;

  @Column({ name: 'invalid_email', type: 'boolean', default: false })
  invalidEmail: boolean;

  // Mailing Address
  @Column({ name: 'primary_address_street', type: 'varchar', length: 150, nullable: true })
  primaryAddressStreet: string;

  @Column({ name: 'primary_address_city', type: 'varchar', length: 100, nullable: true })
  primaryAddressCity: string;

  @Column({ name: 'primary_address_state', type: 'varchar', length: 100, nullable: true })
  primaryAddressState: string;

  @Column({ name: 'primary_address_postalcode', type: 'varchar', length: 20, nullable: true })
  primaryAddressPostalcode: string;

  @Column({ name: 'primary_address_country', type: 'varchar', length: 100, nullable: true })
  primaryAddressCountry: string;

  // Alt Address
  @Column({ name: 'alt_address_street', type: 'varchar', length: 150, nullable: true })
  altAddressStreet: string;

  @Column({ name: 'alt_address_city', type: 'varchar', length: 100, nullable: true })
  altAddressCity: string;

  @Column({ name: 'alt_address_state', type: 'varchar', length: 100, nullable: true })
  altAddressState: string;

  @Column({ name: 'alt_address_postalcode', type: 'varchar', length: 20, nullable: true })
  altAddressPostalcode: string;

  @Column({ name: 'alt_address_country', type: 'varchar', length: 100, nullable: true })
  altAddressCountry: string;

  @Column({ name: 'lead_source', type: 'varchar', length: 100, nullable: true })
  leadSource: string;

  @Column({ type: 'date', nullable: true })
  birthdate: Date;

  @Column({ type: 'varchar', length: 75, nullable: true })
  assistant: string;

  @Column({ name: 'assistant_phone', type: 'varchar', length: 100, nullable: true })
  assistantPhone: string;

  @Column({ name: 'reports_to_id', type: 'uuid', nullable: true })
  reportsToId: string;

  @Column({ name: 'assigned_user_id', type: 'uuid', nullable: true })
  assignedUserId: string;

  @Column({ name: 'campaign_id', type: 'uuid', nullable: true })
  campaignId: string;

  @Column({ name: 'do_not_call', type: 'boolean', default: false })
  doNotCall: boolean;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Relations
  @ManyToOne(() => Account, account => account.contacts)
  @JoinColumn({ name: 'account_id' })
  account: Account;
}