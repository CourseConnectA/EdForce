import { Address, BaseEntity } from './index';
import * as Enums from './enums';

// Core Business Entities
export interface Account extends BaseEntity {
  name: string;
  accountType: Enums.AccountType;
  industry: string;
  website: string;
  phoneOffice: string;
  phoneFax: string;
  employees: number;
  annualRevenue: number;
  rating: Enums.Rating;
  ownership: string;
  sicCode: string;
  parentAccountId?: string;
  billingAddress: Address;
  shippingAddress: Address;
  description: string;
  assignedUserId: string;
  campaignId?: string;
}

export interface Contact extends BaseEntity {
  firstName: string;
  lastName: string;
  accountId?: string;
  title: string;
  department: string;
  phoneWork: string;
  phoneMobile: string;
  phoneHome: string;
  email1: string;
  email2: string;
  emailOptOut: boolean;
  invalidEmail: boolean;
  mailingAddress: Address;
  otherAddress: Address;
  leadSource: string;
  birthdate: Date;
  assistant: string;
  assistantPhone: string;
  reportsToId?: string;
  assignedUserId: string;
  campaignId?: string;
  doNotCall: boolean;
  description: string;
}

export interface Lead extends BaseEntity {
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  industry: string;
  phoneWork: string;
  phoneMobile: string;
  email1: string;
  email2: string;
  website: string;
  leadSource: string;
  leadSourceDescription: string;
  status: Enums.LeadStatus;
  statusDescription: string;
  primaryAddress: Address;
  altAddress: Address;
  assignedUserId: string;
  campaignId?: string;
  convertedAccountId?: string;
  convertedContactId?: string;
  convertedOpportunityId?: string;
  doNotCall: boolean;
  description: string;
}

export interface Opportunity extends BaseEntity {
  name: string;
  accountId: string;
  amount: number;
  dateClosed: Date;
  salesStage: Enums.SalesStage;
  probability: number;
  nextStep: string;
  leadSource: string;
  campaignId?: string;
  assignedUserId: string;
  description: string;
}

export interface Case extends BaseEntity {
  caseNumber: string;
  name: string;
  accountId?: string;
  contactId?: string;
  type: Enums.CaseType;
  status: Enums.CaseStatus;
  priority: Enums.CasePriority;
  resolution: string;
  description: string;
  assignedUserId: string;
}

// Activity & Communication Entities
export interface Task extends BaseEntity {
  name: string;
  status: Enums.TaskStatus;
  priority: Enums.Priority;
  dateStart: Date;
  dateDue: Date;
  contactId?: string;
  parentType: string;
  parentId: string;
  assignedUserId: string;
  description: string;
}

export interface MeetingAttendee {
  id: string;
  meetingId: string;
  name: string;
  email: string;
  status: 'accepted' | 'declined' | 'tentative' | 'pending';
}

export interface Meeting extends BaseEntity {
  name: string;
  location: string;
  dateStart: Date;
  dateEnd: Date;
  duration: number;
  status: Enums.MeetingStatus;
  parentType: string;
  parentId: string;
  assignedUserId: string;
  description: string;
  attendees: MeetingAttendee[];
}

export interface Call extends BaseEntity {
  name: string;
  dateStart: Date;
  duration: number;
  status: Enums.MeetingStatus;
  direction: Enums.CallDirection;
  parentType: string;
  parentId: string;
  assignedUserId: string;
  description: string;
}

export interface Email extends BaseEntity {
  name: string;
  fromAddr: string;
  toAddrs: string;
  ccAddrs: string;
  bccAddrs: string;
  dateSent: Date;
  messageId: string;
  status: Enums.EmailStatus;
  type: Enums.EmailType;
  flagged: boolean;
  replyToAddr: string;
  description: string;
  descriptionHtml: string;
  parentType: string;
  parentId: string;
  assignedUserId: string;
}

// Marketing & Campaign Entities
export interface Campaign extends BaseEntity {
  name: string;
  campaignType: Enums.CampaignType;
  status: Enums.CampaignStatus;
  startDate: Date;
  endDate: Date;
  budget: number;
  expectedCost: number;
  actualCost: number;
  expectedRevenue: number;
  impressions: number;
  assignedUserId: string;
  content: string;
  frequency: string;
  description: string;
  objective: string;
}

export interface ProspectList extends BaseEntity {
  name: string;
  listType: Enums.ProspectListType;
  description: string;
  assignedUserId: string;
}

// Product & Sales Entities
export interface Product extends BaseEntity {
  name: string;
  partNumber: string;
  category: string;
  type: Enums.ProductType;
  cost: number;
  listPrice: number;
  discount: number;
  pricing: string;
  pricingFormula: string;
  taxClass: string;
  weight: number;
  manufacturer: string;
  url: string;
  status: Enums.ProductStatus;
  support: string;
  description: string;
  dateAvailable: Date;
}

export interface QuoteLineItem {
  id: string;
  quoteId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalAmount: number;
  description: string;
}

export interface Quote extends BaseEntity {
  name: string;
  quoteNumber: string;
  quoteDate: Date;
  quoteStage: Enums.QuoteStage;
  validUntil: Date;
  accountId: string;
  contactId: string;
  opportunityId?: string;
  assignedUserId: string;
  approvalStatus: Enums.ApprovalStatus;
  approvedBy?: string;
  totalAmount: number;
  totalAmountUnadj: number;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  shippingAmount: number;
  description: string;
  lineItems: QuoteLineItem[];
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalAmount: number;
  description: string;
}

export interface Invoice extends BaseEntity {
  name: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  status: Enums.InvoiceStatus;
  accountId: string;
  contactId: string;
  quoteId?: string;
  assignedUserId: string;
  totalAmount: number;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  shippingAmount: number;
  description: string;
  lineItems: InvoiceLineItem[];
}

// System & Admin Entities
export interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  recordsPerPage: number;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string;
}

export interface Role extends BaseEntity {
  name: string;
  description: string;
  permissions: Permission[];
}

export interface SecurityGroup extends BaseEntity {
  name: string;
  description: string;
  users: User[];
  modules: string[];
}

export interface User extends BaseEntity {
  userName: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneHome: string;
  phoneMobile: string;
  phoneWork: string;
  address: Address;
  status: Enums.UserStatus;
  isAdmin: boolean;
  title: string;
  department: string;
  reportsToId?: string;
  userPreferences: UserPreferences;
  roles: Role[];
  securityGroups: SecurityGroup[];
}