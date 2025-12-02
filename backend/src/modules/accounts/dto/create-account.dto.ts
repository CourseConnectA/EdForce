import { IsString, IsOptional, IsEnum, IsNumber, IsUUID, MinLength, MaxLength, IsEmail, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateAccountDto {
  @ApiProperty({
    description: 'Account name',
    example: 'Acme Corporation',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({
    description: 'Account type',
    enum: ['Customer', 'Prospect', 'Partner', 'Reseller', 'Competitor', 'Other'],
    example: 'Customer',
  })
  @IsOptional()
  @IsEnum(['Customer', 'Prospect', 'Partner', 'Reseller', 'Competitor', 'Other'])
  accountType?: string;

  @ApiPropertyOptional({
    description: 'Industry',
    example: 'Technology',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional({
    description: 'Website URL',
    example: 'https://acme.com',
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({
    description: 'Office phone number',
    example: '+1-555-123-4567',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  phoneOffice?: string;

  @ApiPropertyOptional({
    description: 'Fax number',
    example: '+1-555-123-4568',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  phoneFax?: string;

  @ApiPropertyOptional({
    description: 'Number of employees',
    example: 150,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  employees?: number;

  @ApiPropertyOptional({
    description: 'Annual revenue',
    example: 5000000.00,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  annualRevenue?: number;

  @ApiPropertyOptional({
    description: 'Account rating',
    enum: ['Hot', 'Warm', 'Cold'],
    example: 'Hot',
  })
  @IsOptional()
  @IsEnum(['Hot', 'Warm', 'Cold'])
  rating?: string;

  @ApiPropertyOptional({
    description: 'Ownership type',
    example: 'Private',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ownership?: string;

  @ApiPropertyOptional({
    description: 'SIC code',
    example: '7372',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  sicCode?: string;

  @ApiPropertyOptional({
    description: 'Parent account ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  parentAccountId?: string;

  // Billing Address
  @ApiPropertyOptional({
    description: 'Billing address street',
    example: '123 Main St',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  billingAddressStreet?: string;

  @ApiPropertyOptional({
    description: 'Billing address city',
    example: 'New York',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  billingAddressCity?: string;

  @ApiPropertyOptional({
    description: 'Billing address state',
    example: 'NY',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  billingAddressState?: string;

  @ApiPropertyOptional({
    description: 'Billing address postal code',
    example: '10001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  billingAddressPostalcode?: string;

  @ApiPropertyOptional({
    description: 'Billing address country',
    example: 'United States',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  billingAddressCountry?: string;

  // Shipping Address
  @ApiPropertyOptional({
    description: 'Shipping address street',
    example: '456 Oak Ave',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  shippingAddressStreet?: string;

  @ApiPropertyOptional({
    description: 'Shipping address city',
    example: 'Los Angeles',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shippingAddressCity?: string;

  @ApiPropertyOptional({
    description: 'Shipping address state',
    example: 'CA',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shippingAddressState?: string;

  @ApiPropertyOptional({
    description: 'Shipping address postal code',
    example: '90210',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  shippingAddressPostalcode?: string;

  @ApiPropertyOptional({
    description: 'Shipping address country',
    example: 'United States',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shippingAddressCountry?: string;

  @ApiPropertyOptional({
    description: 'Account description',
    example: 'Leading provider of software solutions',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Assigned user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @ApiPropertyOptional({
    description: 'Campaign ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  campaignId?: string;
}