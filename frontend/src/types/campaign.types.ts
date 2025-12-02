export interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: CampaignType;
  status: CampaignStatus;
  budget?: number;
  spent: number;
  startDate?: string;
  endDate?: string;
  targetAudience?: {
    leadStatus?: string[];
    accountType?: string[];
    location?: string[];
    ageRange?: { min: number; max: number };
    interests?: string[];
  };
  content?: {
    subject?: string;
    body?: string;
    attachments?: string[];
    socialMediaPosts?: any[];
    landingPageUrl?: string;
  };
  metrics?: {
    impressions?: number;
    clicks?: number;
    conversions?: number;
    revenue?: number;
    engagementRate?: number;
    conversionRate?: number;
  };
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export enum CampaignType {
  EMAIL = 'email',
  SMS = 'sms',
  SOCIAL_MEDIA = 'social_media',
  WEBINAR = 'webinar',
  EVENT = 'event',
  CONTENT = 'content',
  ADVERTISING = 'advertising',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface CreateCampaignDto {
  name: string;
  description?: string;
  type?: CampaignType;
  status?: CampaignStatus;
  budget?: number;
  spent?: number;
  startDate?: string;
  endDate?: string;
  targetAudience?: any;
  content?: any;
  metrics?: any;
  ownerId?: string;
}

export interface UpdateCampaignDto extends Partial<CreateCampaignDto> {}

export interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalBudget: number;
  totalSpent: number;
  campaignsByType: Array<{ type: string; count: number }>;
  campaignsByStatus: Array<{ status: string; count: number }>;
}