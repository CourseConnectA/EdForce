import { apiService } from './apiService';

export interface Opportunity {
  id: string;
  name: string;
  accountId: string;
  account?: {
    id: string;
    name: string;
  };
  contactId?: string;
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  amount: number;
  salesStage: string;
  probability?: number;
  dateClosedExpected?: string;
  dateClosed?: string;
  description?: string;
  nextStep?: string;
  assignedUserId?: string;
  assignedTo?: {
    id: string;
    userName: string;
  };
  campaignId?: string;
  dateEntered: string;
  dateModified: string;
}

export interface CreateOpportunityDto {
  name: string;
  amount: number;
  accountId?: string;
  contactId?: string;
  salesStage?: string;
  probability?: number;
  dateClosedExpected?: string;
  dateClosed?: string;
  nextStep?: string;
  assignedUserId?: string;
  campaignId?: string;
  description?: string;
}

export interface UpdateOpportunityDto extends Partial<CreateOpportunityDto> {}

export interface OpportunitiesResponse {
  data: Opportunity[];
  total: number;
  page: number;
  limit: number;
}

export interface OpportunitiesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  accountId?: string;
  salesStage?: string;
  assignedUserId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class OpportunitiesService {
  private readonly basePath = '/opportunities';

  async getOpportunities(params?: OpportunitiesQueryParams): Promise<OpportunitiesResponse> {
    const queryString = params ? this.buildQueryString(params) : '';
    return apiService.get(`${this.basePath}${queryString}`);
  }

  async getOpportunity(id: string): Promise<Opportunity> {
    return apiService.get(`${this.basePath}/${id}`);
  }

  async createOpportunity(data: CreateOpportunityDto): Promise<Opportunity> {
    return apiService.post(this.basePath, data);
  }

  async updateOpportunity(id: string, data: UpdateOpportunityDto): Promise<Opportunity> {
    return apiService.patch(`${this.basePath}/${id}`, data);
  }

  async deleteOpportunity(id: string): Promise<void> {
    return apiService.delete(`${this.basePath}/${id}`);
  }

  private buildQueryString(params: OpportunitiesQueryParams): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }
}

export const opportunitiesService = new OpportunitiesService();
export default opportunitiesService;