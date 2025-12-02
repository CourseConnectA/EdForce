// Enums for the CRM system

export enum AccountType {
  CUSTOMER = 'customer',
  PROSPECT = 'prospect',
  PARTNER = 'partner',
  VENDOR = 'vendor'
}

export enum Rating {
  HOT = 'hot',
  WARM = 'warm',
  COLD = 'cold'
}

export enum LeadStatus {
  NEW = 'new',
  ASSIGNED = 'assigned',
  IN_PROCESS = 'inProcess',
  CONVERTED = 'converted',
  RECYCLED = 'recycled',
  DEAD = 'dead'
}

export enum SalesStage {
  PROSPECTING = 'prospecting',
  QUALIFICATION = 'qualification',
  NEEDS_ANALYSIS = 'needsAnalysis',
  VALUE_PROPOSITION = 'valueProposition',
  ID_DECISION_MAKERS = 'idDecisionMakers',
  PERCEPTION_ANALYSIS = 'perceptionAnalysis',
  PROPOSAL_PRICE_QUOTE = 'proposalPriceQuote',
  NEGOTIATION_REVIEW = 'negotiationReview',
  CLOSED_WON = 'closedWon',
  CLOSED_LOST = 'closedLost'
}

export enum CaseType {
  ADMINISTRATION = 'administration',
  PRODUCT = 'product',
  USER = 'user'
}

export enum CaseStatus {
  NEW = 'new',
  ASSIGNED = 'assigned',
  CLOSED = 'closed',
  PENDING = 'pending',
  REJECTED = 'rejected'
}

export enum Priority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum CasePriority {
  P1 = 'p1',
  P2 = 'p2',
  P3 = 'p3'
}

export enum TaskStatus {
  NOT_STARTED = 'notStarted',
  IN_PROGRESS = 'inProgress',
  COMPLETED = 'completed',
  PENDING = 'pending',
  DEFERRED = 'deferred'
}

export enum MeetingStatus {
  PLANNED = 'planned',
  HELD = 'held',
  NOT_HELD = 'notHeld'
}

export enum CallDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound'
}

export enum EmailStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  ARCHIVED = 'archived'
}

export enum EmailType {
  ARCHIVED = 'archived',
  DRAFT = 'draft',
  OUT = 'out',
  INBOUND = 'inbound'
}

export enum CampaignType {
  TELESALES = 'telesales',
  MAIL = 'mail',
  EMAIL = 'email',
  WEB = 'web',
  RADIO = 'radio',
  TELEVISION = 'television',
  NEWSPRINT = 'newsprint'
}

export enum CampaignStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  COMPLETE = 'complete'
}

export enum ProspectListType {
  DEFAULT = 'default',
  SEED = 'seed',
  EXEMPT = 'exempt'
}

export enum ProductType {
  GOOD = 'good',
  SERVICE = 'service'
}

export enum ProductStatus {
  QUOTES = 'quotes',
  ORDERS = 'orders'
}

export enum QuoteStage {
  DRAFT = 'draft',
  NEGOTIATION = 'negotiation',
  DELIVERED = 'delivered',
  ON_HOLD = 'onHold',
  CONFIRMED = 'confirmed',
  CLOSED = 'closed',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected'
}

export enum ApprovalStatus {
  APPROVED = 'approved',
  UNDER_REVIEW = 'underReview',
  REJECTED = 'rejected'
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  CANCELLED = 'cancelled'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

export enum UserRole {
  SUPER_ADMIN = 'super-admin',
  CENTER_MANAGER = 'center-manager',
  COUNSELOR = 'counselor',
}