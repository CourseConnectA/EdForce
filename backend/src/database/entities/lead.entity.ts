import { Entity, Column, Index } from 'typeorm';
import { BaseEntityDB } from './base.entity';

@Entity('leads')
export class Lead extends BaseEntityDB {
  // Core identifiers
  @Index({ unique: true })
  @Column({ name: 'reference_no', type: 'varchar', length: 16, unique: true })
  referenceNo: string; // Auto-generated unique string: 2-3 letter center code + 8-10 digits (e.g., SN1234567890)

  // Person details
  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({ name: 'email', type: 'varchar', length: 150 })
  email: string;

  @Column({ name: 'email_verified', type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ name: 'mobile_number', type: 'varchar', length: 30 })
  mobileNumber: string;

  @Column({ name: 'alternate_number', type: 'varchar', length: 30, nullable: true })
  alternateNumber?: string;

  @Column({ name: 'mobile_verified', type: 'boolean', default: false })
  mobileVerified: boolean;

  @Column({ name: 'whatsapp_number', type: 'varchar', length: 30, nullable: true })
  whatsappNumber?: string; // can be same as mobile

  @Column({ name: 'whatsapp_verified', type: 'boolean', default: false })
  whatsappVerified: boolean;

  // Location & demographics
  @Column({ name: 'location_city', type: 'varchar', length: 100, nullable: true })
  locationCity?: string;

  @Column({ name: 'location_state', type: 'varchar', length: 100, nullable: true })
  locationState?: string;

  @Column({ name: 'nationality', type: 'varchar', length: 100, nullable: true })
  nationality?: string;

  @Column({ name: 'gender', type: 'varchar', length: 32, nullable: true })
  gender?: string; // Male/Female/Other/Prefer not to say

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth?: Date;

  @Column({ name: 'mother_tongue', type: 'varchar', length: 100, nullable: true })
  motherTongue?: string;

  // Education & program
  @Column({ name: 'highest_qualification', type: 'varchar', length: 64, nullable: true })
  highestQualification?: '12th' | 'Bachelor Degree' | 'Master Degree' | 'Doctorate' | string;

  @Column({ name: 'year_of_completion', type: 'int', nullable: true })
  yearOfCompletion?: number;

  @Column({ name: 'years_of_experience', type: 'varchar', length: 64, nullable: true })
  yearsOfExperience?: 'Still a student' | 'Fresh Graduate' | '0-2 years' | '3-5 years' | '5-10 years' | '10+ years' | string;

  @Column({ name: 'university', type: 'varchar', length: 150, nullable: true })
  university?: string;

  @Column({ name: 'program', type: 'varchar', length: 150, nullable: true })
  program?: string;

  @Column({ name: 'specialization', type: 'varchar', length: 150, nullable: true })
  specialization?: string;

  @Column({ name: 'batch', type: 'varchar', length: 50, nullable: true })
  batch?: string; // e.g., 'Jan 2026' or 'July 2026'

  // Ownership & meta
  @Column({ name: 'assigned_user_id', type: 'uuid', nullable: true })
  assignedUserId?: string; // Lead Owner / Counselor

  @Column({ name: 'counselor_name', type: 'varchar', length: 150, nullable: true })
  counselorName?: string;

  @Column({ name: 'counselor_code', type: 'varchar', length: 64, nullable: true })
  counselorCode?: string;

  // Source & status
  @Column({ name: 'lead_source', type: 'varchar', length: 100, nullable: true })
  leadSource?: string;

  @Column({ name: 'lead_sub_source', type: 'varchar', length: 100, nullable: true })
  leadSubSource?: string;

  @Column({ name: 'created_from', type: 'varchar', length: 150, nullable: true })
  createdFrom?: string; // From the source it's created (free-text or dropdown)

  @Column({ name: 'lead_status', type: 'varchar', length: 50, default: 'New' })
  leadStatus: string; // dropdown

  @Column({ name: 'lead_sub_status', type: 'varchar', length: 100, nullable: true })
  leadSubStatus?: string; // dropdown

  // Scoring and scheduling
  @Column({ name: 'lead_score_percent', type: 'int', default: 0 })
  leadScorePercent: number; // 0-100

  @Column({ name: 'next_follow_up_at', type: 'timestamp', nullable: true })
  nextFollowUpAt?: Date;

  // Notes & reasons
  @Column({ name: 'lead_description', type: 'text', nullable: true })
  leadDescription?: string;

  @Column({ name: 'reason_dead_invalid', type: 'text', nullable: true })
  reasonDeadInvalid?: string;

  @Column({ name: 'comment', type: 'text', nullable: true })
  comment?: string;

  // Legacy/business optional fields retained for compatibility
  @Column({ type: 'varchar', length: 100, nullable: true })
  title?: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  company?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  industry?: string;

  @Column({ name: 'phone_work', type: 'varchar', length: 100, nullable: true })
  phoneWork?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website?: string;

  // Important flag (for quick filtering/starred leads)
  @Index()
  @Column({ name: 'is_important', type: 'boolean', default: false })
  isImportant: boolean;
}