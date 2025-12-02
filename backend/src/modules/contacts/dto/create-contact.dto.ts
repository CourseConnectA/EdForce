import { IsString, IsOptional, IsUUID, IsEmail, IsBoolean, IsDateString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateContactDto {
  @ApiPropertyOptional({
    description: 'First name',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last name',
    example: 'Doe',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Account ID this contact belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiPropertyOptional({
    description: 'Job title',
    example: 'CEO',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({
    description: 'Department',
    example: 'Executive',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({
    description: 'Work phone number',
    example: '+1-555-123-4567',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  phoneWork?: string;

  @ApiPropertyOptional({
    description: 'Mobile phone number',
    example: '+1-555-987-6543',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  phoneMobile?: string;

  @ApiPropertyOptional({
    description: 'Home phone number',
    example: '+1-555-111-2222',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  phoneHome?: string;

  @ApiPropertyOptional({
    description: 'Primary email address',
    example: 'john.doe@example.com',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email1?: string;

  @ApiPropertyOptional({
    description: 'Secondary email address',
    example: 'john.doe.personal@gmail.com',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email2?: string;

  @ApiPropertyOptional({
    description: 'Email opt-out status',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  emailOptOut?: boolean;

  @ApiPropertyOptional({
    description: 'Invalid email flag',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  invalidEmail?: boolean;

  // Primary Address
  @ApiPropertyOptional({
    description: 'Primary address street',
    example: '123 Main St',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  primaryAddressStreet?: string;

  @ApiPropertyOptional({
    description: 'Primary address city',
    example: 'New York',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  primaryAddressCity?: string;

  @ApiPropertyOptional({
    description: 'Primary address state',
    example: 'NY',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  primaryAddressState?: string;

  @ApiPropertyOptional({
    description: 'Primary address postal code',
    example: '10001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  primaryAddressPostalcode?: string;

  @ApiPropertyOptional({
    description: 'Primary address country',
    example: 'United States',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  primaryAddressCountry?: string;

  @ApiPropertyOptional({
    description: 'Lead source',
    example: 'Website',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  leadSource?: string;

  @ApiPropertyOptional({
    description: 'Birth date',
    example: '1985-05-15',
  })
  @IsOptional()
  @IsDateString()
  birthdate?: Date;

  @ApiPropertyOptional({
    description: 'Assistant name',
    example: 'Jane Smith',
  })
  @IsOptional()
  @IsString()
  @MaxLength(75)
  assistant?: string;

  @ApiPropertyOptional({
    description: 'Assistant phone number',
    example: '+1-555-999-8888',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  assistantPhone?: string;

  @ApiPropertyOptional({
    description: 'Reports to contact ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  reportsToId?: string;

  @ApiPropertyOptional({
    description: 'Assigned user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @ApiPropertyOptional({
    description: 'Do not call flag',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  doNotCall?: boolean;

  @ApiPropertyOptional({
    description: 'Contact description',
    example: 'Key decision maker for technology purchases',
  })
  @IsOptional()
  @IsString()
  description?: string;
}