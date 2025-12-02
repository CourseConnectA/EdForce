import { Entity, Column, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntityDB } from './base.entity';
import { Contact } from './contact.entity';
import { Opportunity } from './opportunity.entity';

@Entity('accounts')
export class Account extends BaseEntityDB {
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ name: 'account_type', type: 'enum', enum: ['Customer', 'Prospect', 'Partner', 'Reseller', 'Competitor', 'Other'], default: 'Prospect' })
  accountType: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  industry: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string;

  @Column({ name: 'phone_office', type: 'varchar', length: 100, nullable: true })
  phoneOffice: string;

  @Column({ name: 'phone_fax', type: 'varchar', length: 100, nullable: true })
  phoneFax: string;

  @Column({ type: 'int', nullable: true })
  employees: number;

  @Column({ name: 'annual_revenue', type: 'decimal', precision: 26, scale: 6, nullable: true })
  annualRevenue: number;

  @Column({ type: 'enum', enum: ['Hot', 'Warm', 'Cold'], nullable: true })
  rating: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ownership: string;

  @Column({ name: 'sic_code', type: 'varchar', length: 10, nullable: true })
  sicCode: string;

  @Column({ name: 'parent_account_id', type: 'uuid', nullable: true })
  parentAccountId: string;

  // Billing Address
  @Column({ name: 'billing_address_street', type: 'varchar', length: 150, nullable: true })
  billingAddressStreet: string;

  @Column({ name: 'billing_address_city', type: 'varchar', length: 100, nullable: true })
  billingAddressCity: string;

  @Column({ name: 'billing_address_state', type: 'varchar', length: 100, nullable: true })
  billingAddressState: string;

  @Column({ name: 'billing_address_postalcode', type: 'varchar', length: 20, nullable: true })
  billingAddressPostalcode: string;

  @Column({ name: 'billing_address_country', type: 'varchar', length: 100, nullable: true })
  billingAddressCountry: string;

  // Shipping Address
  @Column({ name: 'shipping_address_street', type: 'varchar', length: 150, nullable: true })
  shippingAddressStreet: string;

  @Column({ name: 'shipping_address_city', type: 'varchar', length: 100, nullable: true })
  shippingAddressCity: string;

  @Column({ name: 'shipping_address_state', type: 'varchar', length: 100, nullable: true })
  shippingAddressState: string;

  @Column({ name: 'shipping_address_postalcode', type: 'varchar', length: 20, nullable: true })
  shippingAddressPostalcode: string;

  @Column({ name: 'shipping_address_country', type: 'varchar', length: 100, nullable: true })
  shippingAddressCountry: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'assigned_user_id', type: 'uuid', nullable: true })
  assignedUserId: string;

  @Column({ name: 'campaign_id', type: 'uuid', nullable: true })
  campaignId: string;

  // Relations
  @OneToMany(() => Contact, contact => contact.account)
  contacts: Contact[];

  @OneToMany(() => Opportunity, opportunity => opportunity.account)
  opportunities: Opportunity[];
}