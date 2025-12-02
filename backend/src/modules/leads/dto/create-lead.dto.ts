import { IsString, IsOptional, IsEmail, IsBoolean, IsDateString, MinLength, MaxLength, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeadDto {
  // Required fields
  @ApiProperty({ description: 'First name', example: 'John' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ description: 'Email ID', example: 'john.doe@example.com' })
  @IsEmail()
  @MaxLength(150)
  email: string;

  @ApiProperty({ description: 'Mobile Number', example: '+91-9876543210' })
  @IsString()
  @MaxLength(30)
  mobileNumber: string;

  // Verification checkboxes
  @ApiPropertyOptional({ description: 'Email verified' })
  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;

  @ApiPropertyOptional({ description: 'Alternate phone' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  alternateNumber?: string;

  @ApiPropertyOptional({ description: 'Mobile verified' })
  @IsOptional()
  @IsBoolean()
  mobileVerified?: boolean;

  @ApiPropertyOptional({ description: 'WhatsApp number (can be same as mobile)' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  whatsappNumber?: string;

  @ApiPropertyOptional({ description: 'WhatsApp verified' })
  @IsOptional()
  @IsBoolean()
  whatsappVerified?: boolean;

  // Location & demographics
  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  locationCity?: string;

  @ApiPropertyOptional({ description: 'State' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  locationState?: string;

  @ApiPropertyOptional({ description: 'Nationality' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationality?: string;

  @ApiPropertyOptional({ description: 'Gender' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  gender?: string;

  @ApiPropertyOptional({ description: 'Date of Birth', example: '1999-01-31' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Mother Tongue' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  motherTongue?: string;

  // Education & program
  @ApiPropertyOptional({ description: 'Highest Qualification', example: 'Bachelor Degree' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  highestQualification?: string;

  @ApiPropertyOptional({ description: 'Year of Completion', example: 2024 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  yearOfCompletion?: number;

  @ApiPropertyOptional({ description: 'Years of Experience', example: '0-2 years' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  yearsOfExperience?: string;

  @ApiPropertyOptional({ description: 'University' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  university?: string;

  @ApiPropertyOptional({ description: 'Program' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  program?: string;

  @ApiPropertyOptional({ description: 'Specialization' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  specialization?: string;

  @ApiPropertyOptional({ description: 'Batch', example: 'Jan 2026' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  batch?: string;

  // Source & status
  @ApiPropertyOptional({ description: 'Lead Source', example: 'Website' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  leadSource?: string;

  @ApiPropertyOptional({ description: 'Lead Sub-source', example: 'Contact Form' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  leadSubSource?: string;

  @ApiPropertyOptional({ description: 'Created From (channel name)' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  createdFrom?: string;

  @ApiPropertyOptional({ description: 'Lead Status', example: 'New' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  leadStatus?: string;

  @ApiPropertyOptional({ description: 'Lead Sub Status' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  leadSubStatus?: string;

  // Scheduling & notes
  @ApiPropertyOptional({ description: 'Next Follow up date/time', example: '2025-01-01T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  nextFollowUpAt?: string;

  @ApiPropertyOptional({ description: 'Lead Description' })
  @IsOptional()
  @IsString()
  leadDescription?: string;

  @ApiPropertyOptional({ description: 'Reason for Dead & Invalid Leads' })
  @IsOptional()
  @IsString()
  reasonDeadInvalid?: string;

  @ApiPropertyOptional({ description: 'Comment' })
  @IsOptional()
  @IsString()
  comment?: string;

  // Ownership
  @ApiPropertyOptional({ description: 'Assign to User ID (Lead Owner)' })
  @IsOptional()
  @IsString()
  assignedUserId?: string;

  // Optional legacy fields
  @ApiPropertyOptional({ description: 'Company' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  company?: string;

  @ApiPropertyOptional({ description: 'Title' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({ description: 'Industry' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional({ description: 'Website' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({ description: 'Mark as Important (starred lead)' })
  @IsOptional()
  @IsBoolean()
  isImportant?: boolean;

  // Scoring (from third-party tracking)
  @ApiPropertyOptional({ description: 'Actions-based score percentage (0-100)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  actionsScore?: number;
}