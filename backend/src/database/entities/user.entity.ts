import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntityDB } from './base.entity';

@Entity('users')
export class User extends BaseEntityDB {
  @Column({ name: 'user_name', type: 'varchar', length: 60, unique: true })
  userName: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Column({ name: 'user_hash', type: 'varchar', length: 255 })
  userHash: string; // password hash

  @Column({ name: 'phone_home', type: 'varchar', length: 100, nullable: true })
  phoneHome: string;

  @Column({ name: 'phone_mobile', type: 'varchar', length: 100, nullable: true })
  phoneMobile: string;

  @Column({ name: 'phone_work', type: 'varchar', length: 100, nullable: true })
  phoneWork: string;

  // Address
  @Column({ name: 'address_street', type: 'varchar', length: 150, nullable: true })
  addressStreet: string;

  @Column({ name: 'address_city', type: 'varchar', length: 100, nullable: true })
  addressCity: string;

  @Column({ name: 'address_state', type: 'varchar', length: 100, nullable: true })
  addressState: string;

  @Column({ name: 'address_postalcode', type: 'varchar', length: 20, nullable: true })
  addressPostalcode: string;

  @Column({ name: 'address_country', type: 'varchar', length: 100, nullable: true })
  addressCountry: string;

  @Column({ name: 'is_admin', type: 'boolean', default: false })
  isAdmin: boolean;

  // Role-based access (supersedes isAdmin for new features)
  @Column({ type: 'varchar', length: 50, nullable: true, default: 'counselor' })
  role: string; // 'super-admin' | 'center-manager' | 'counselor'

  // Center affiliation for Center Manager and Counselors
  @Column({ name: 'center_name', type: 'varchar', length: 150, nullable: true })
  centerName: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  title: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  department: string;

  @Column({ name: 'reports_to_id', type: 'uuid', nullable: true })
  reportsToId: string;

  // User Preferences (stored as JSON)
  @Column({ name: 'user_preferences', type: 'jsonb', nullable: true })
  userPreferences: {
    theme: 'light' | 'dark';
    language: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    recordsPerPage: number;
    emailNotifications: boolean;
    pushNotifications: boolean;
  };

  @Column({ name: 'last_login', type: 'timestamp', nullable: true })
  lastLogin: Date;

  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  refreshToken: string;

  // Presence for availability dashboard
  @Column({ type: 'varchar', length: 20, default: 'offline' })
  presence: 'online' | 'offline' | 'in_meeting' | 'on_call';

  // Unique counselor code for assignment and display (e.g., #123456)
  @Column({ name: 'counselor_code', type: 'varchar', length: 16, unique: true, nullable: true })
  counselorCode: string | null;
}