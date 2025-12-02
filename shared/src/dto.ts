// Data Transfer Objects (DTOs) for API requests and responses

export interface CreateAccountDto {
  name: string;
  accountType: string;
  industry?: string;
  website?: string;
  phoneOffice?: string;
  phoneFax?: string;
  employees?: number;
  annualRevenue?: number;
  rating?: string;
  ownership?: string;
  sicCode?: string;
  parentAccountId?: string;
  billingAddress?: Partial<Address>;
  shippingAddress?: Partial<Address>;
  description?: string;
  assignedUserId?: string;
  campaignId?: string;
}

export interface UpdateAccountDto extends Partial<CreateAccountDto> {
  id: string;
}

export interface CreateContactDto {
  firstName: string;
  lastName: string;
  accountId?: string;
  title?: string;
  department?: string;
  phoneWork?: string;
  phoneMobile?: string;
  phoneHome?: string;
  email1: string;
  email2?: string;
  emailOptOut?: boolean;
  invalidEmail?: boolean;
  mailingAddress?: Partial<Address>;
  otherAddress?: Partial<Address>;
  leadSource?: string;
  birthdate?: Date;
  assistant?: string;
  assistantPhone?: string;
  reportsToId?: string;
  assignedUserId?: string;
  campaignId?: string;
  doNotCall?: boolean;
  description?: string;
}

export interface UpdateContactDto extends Partial<CreateContactDto> {
  id: string;
}

export interface CreateLeadDto {
  firstName: string;
  lastName: string;
  title?: string;
  company: string;
  industry?: string;
  phoneWork?: string;
  phoneMobile?: string;
  email1: string;
  email2?: string;
  website?: string;
  leadSource?: string;
  leadSourceDescription?: string;
  status?: string;
  statusDescription?: string;
  primaryAddress?: Partial<Address>;
  altAddress?: Partial<Address>;
  assignedUserId?: string;
  campaignId?: string;
  doNotCall?: boolean;
  description?: string;
}

export interface UpdateLeadDto extends Partial<CreateLeadDto> {
  id: string;
}

export interface ConvertLeadDto {
  leadId: string;
  createAccount?: boolean;
  accountId?: string;
  createContact?: boolean;
  contactId?: string;
  createOpportunity?: boolean;
  opportunityName?: string;
  opportunityAmount?: number;
  opportunityStage?: string;
}

export interface CreateOpportunityDto {
  name: string;
  accountId: string;
  amount: number;
  dateClosed: Date;
  salesStage?: string;
  probability?: number;
  nextStep?: string;
  leadSource?: string;
  campaignId?: string;
  assignedUserId?: string;
  description?: string;
}

export interface UpdateOpportunityDto extends Partial<CreateOpportunityDto> {
  id: string;
}

export interface CreateCaseDto {
  name: string;
  accountId?: string;
  contactId?: string;
  type: string;
  status?: string;
  priority?: string;
  description?: string;
  assignedUserId?: string;
}

export interface UpdateCaseDto extends Partial<CreateCaseDto> {
  id: string;
  resolution?: string;
}

export interface CreateTaskDto {
  name: string;
  status?: string;
  priority?: string;
  dateStart?: Date;
  dateDue: Date;
  contactId?: string;
  parentType: string;
  parentId: string;
  assignedUserId?: string;
  description?: string;
}

export interface UpdateTaskDto extends Partial<CreateTaskDto> {
  id: string;
}

export interface CreateMeetingDto {
  name: string;
  location?: string;
  dateStart: Date;
  dateEnd: Date;
  parentType: string;
  parentId: string;
  assignedUserId?: string;
  description?: string;
  attendees?: Array<{
    name: string;
    email: string;
  }>;
}

export interface UpdateMeetingDto extends Partial<CreateMeetingDto> {
  id: string;
  status?: string;
}

export interface CreateCallDto {
  name: string;
  dateStart: Date;
  duration?: number;
  direction: string;
  parentType: string;
  parentId: string;
  assignedUserId?: string;
  description?: string;
}

export interface UpdateCallDto extends Partial<CreateCallDto> {
  id: string;
  status?: string;
}

export interface CreateEmailDto {
  name: string;
  fromAddr: string;
  toAddrs: string;
  ccAddrs?: string;
  bccAddrs?: string;
  description: string;
  descriptionHtml?: string;
  parentType: string;
  parentId: string;
  assignedUserId?: string;
}

export interface UpdateEmailDto extends Partial<CreateEmailDto> {
  id: string;
  status?: string;
}

export interface CreateCampaignDto {
  name: string;
  campaignType: string;
  status?: string;
  startDate: Date;
  endDate: Date;
  budget?: number;
  expectedCost?: number;
  expectedRevenue?: number;
  assignedUserId?: string;
  content?: string;
  frequency?: string;
  description?: string;
  objective?: string;
}

export interface UpdateCampaignDto extends Partial<CreateCampaignDto> {
  id: string;
  actualCost?: number;
  impressions?: number;
}

export interface CreateProductDto {
  name: string;
  partNumber?: string;
  category?: string;
  type: string;
  cost?: number;
  listPrice: number;
  discount?: number;
  pricing?: string;
  pricingFormula?: string;
  taxClass?: string;
  weight?: number;
  manufacturer?: string;
  url?: string;
  status?: string;
  support?: string;
  description?: string;
  dateAvailable?: Date;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {
  id: string;
}

export interface CreateQuoteDto {
  name: string;
  accountId: string;
  contactId: string;
  opportunityId?: string;
  validUntil: Date;
  assignedUserId?: string;
  description?: string;
  lineItems: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    description?: string;
  }>;
}

export interface UpdateQuoteDto extends Partial<CreateQuoteDto> {
  id: string;
  quoteStage?: string;
  approvalStatus?: string;
}

export interface CreateInvoiceDto {
  name: string;
  accountId: string;
  contactId: string;
  quoteId?: string;
  dueDate: Date;
  assignedUserId?: string;
  description?: string;
  lineItems: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    description?: string;
  }>;
}

export interface UpdateInvoiceDto extends Partial<CreateInvoiceDto> {
  id: string;
  status?: string;
}

export interface CreateUserDto {
  userName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneHome?: string;
  phoneMobile?: string;
  phoneWork?: string;
  address?: Partial<Address>;
  title?: string;
  department?: string;
  reportsToId?: string;
  isAdmin?: boolean;
  roleIds?: string[];
  securityGroupIds?: string[];
}

export interface UpdateUserDto extends Partial<Omit<CreateUserDto, 'password'>> {
  id: string;
  status?: string;
  userPreferences?: Partial<UserPreferences>;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface LoginDto {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    userName: string;
    firstName: string;
    lastName: string;
    email: string;
    isAdmin: boolean;
    roles: string[];
    permissions: string[];
  };
  expiresIn: number;
}

// Import types to avoid compilation errors
import { Address } from './index';
import { UserPreferences } from './entities';