import { apiService } from './apiService';

export interface Lead {
  id: string;
  referenceNo: string;
  createdBy?: string;
  ownerName?: string;
  ownerUsername?: string;
  firstName: string;
  lastName: string;
  email: string;
  emailVerified?: boolean;
  mobileNumber: string;
  alternateNumber?: string;
  mobileVerified?: boolean;
  whatsappNumber?: string;
  whatsappVerified?: boolean;
  isImportant?: boolean;
  locationCity?: string;
  locationState?: string;
  nationality?: string;
  gender?: string;
  dateOfBirth?: string;
  motherTongue?: string;
  highestQualification?: string;
  yearOfCompletion?: number;
  yearsOfExperience?: string;
  university?: string;
  program?: string;
  specialization?: string;
  batch?: string;
  company?: string;
  title?: string;
  industry?: string;
  website?: string;
  leadSource?: string;
  leadSubSource?: string;
  createdFrom?: string;
  leadStatus?: string;
  leadSubStatus?: string;
  leadScorePercent?: number;
  nextFollowUpAt?: string;
  leadDescription?: string;
  reasonDeadInvalid?: string;
  comment?: string;
  assignedUserId?: string;
  counselorName?: string;
  counselorCode?: string;
  dateEntered: string;
  dateModified: string;
  customData?: Record<string, any>;
  lastCallDisposition?: string;
  lastCallNotes?: string;
}

export interface CreateLeadDto {
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  emailVerified?: boolean;
  alternateNumber?: string;
  mobileVerified?: boolean;
  whatsappNumber?: string;
  whatsappVerified?: boolean;
  isImportant?: boolean;
  locationCity?: string;
  locationState?: string;
  nationality?: string;
  gender?: string;
  dateOfBirth?: string;
  motherTongue?: string;
  highestQualification?: string;
  yearOfCompletion?: number;
  yearsOfExperience?: string;
  university?: string;
  program?: string;
  specialization?: string;
  batch?: string;
  leadSource?: string;
  leadSubSource?: string;
  createdFrom?: string;
  leadStatus?: string;
  leadSubStatus?: string;
  nextFollowUpAt?: string;
  leadDescription?: string;
  reasonDeadInvalid?: string;
  comment?: string;
  assignedUserId?: string;
  company?: string;
  title?: string;
  industry?: string;
  website?: string;
  actionsScore?: number;
}

export interface UpdateLeadDto extends Partial<CreateLeadDto> {}

export interface LeadsResponse {
  data: Lead[];
  total: number;
  page: number;
  limit: number;
}

export interface LeadsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  leadStatus?: string;
  leadSubStatus?: string;
  leadSource?: string;
  industry?: string;
  locationCity?: string;
  locationState?: string;
  nationality?: string;
  company?: string;
  createdAfter?: string; // ISO date string (YYYY-MM-DD)
  createdBefore?: string; // ISO date string (YYYY-MM-DD)
  assignedToId?: string;
  isImportant?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface LeadView {
  id: string;
  name: string;
  selectedFields: string[];
  filters: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isDefault?: boolean;
  scope?: 'personal' | 'center';
}

class LeadsService {
  private readonly basePath = '/leads';
  private readonly useOpenCreate: boolean = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_USE_OPEN_CREATE === 'true');

  async getLeads(params?: LeadsQueryParams): Promise<LeadsResponse> {
    const queryString = params ? this.buildQueryString(params) : '';
    return apiService.get(`${this.basePath}${queryString}`);
  }

  async getLead(id: string): Promise<Lead> {
    return apiService.get(`${this.basePath}/${id}`);
  }

  async createLead(data: CreateLeadDto): Promise<Lead> {
    const path = this.useOpenCreate ? `${this.basePath}/open-create` : this.basePath;
    return apiService.post(path, data);
  }

  // Backward-compat stub: some slices/components may still call createLeadDynamic
  async createLeadDynamic(values: Partial<CreateLeadDto> & Record<string, any>): Promise<Lead> {
    const v = values || ({} as any);
    const dto: CreateLeadDto = {
      firstName: String(v.firstName || ''),
      lastName: String(v.lastName || ''),
      email: String(v.email || ''),
      mobileNumber: String(v.mobileNumber || ''),
      ...(v.company ? { company: v.company } : {}),
      ...(v.title ? { title: v.title } : {}),
      ...(v.industry ? { industry: v.industry } : {}),
      ...(v.website ? { website: v.website } : {}),
      ...(v.leadSource ? { leadSource: v.leadSource } : {}),
      ...(v.leadSubSource ? { leadSubSource: v.leadSubSource } : {}),
      ...(v.leadStatus ? { leadStatus: v.leadStatus } : {}),
      ...(v.leadSubStatus ? { leadSubStatus: v.leadSubStatus } : {}),
      ...(v.locationCity ? { locationCity: v.locationCity } : {}),
      ...(v.locationState ? { locationState: v.locationState } : {}),
      ...(v.comment ? { comment: v.comment } : {}),
      ...(v.nextFollowUpAt ? { nextFollowUpAt: v.nextFollowUpAt } : {}),
      ...(typeof v.actionsScore === 'number' ? { actionsScore: v.actionsScore } : {}),
    };
    return this.createLead(dto);
  }

  async updateLead(id: string, data: UpdateLeadDto): Promise<Lead> {
    return apiService.patch(`${this.basePath}/${id}`, data);
  }

  async assignLead(id: string, assignedUserId: string): Promise<Lead> {
    return apiService.patch(`${this.basePath}/${id}/assign`, { assignedUserId });
  }

  async assignLeadsBulk(ids: string[], assignedUserId: string): Promise<{ updated: number; ids: string[] }> {
    return apiService.patch(`${this.basePath}/assign-bulk`, { ids, assignedUserId });
  }

  async listCounselors(search?: string): Promise<Array<{ id: string; firstName: string; lastName: string; userName: string }>> {
    const q: string[] = ['role=counselor','limit=200'];
    if (search) q.push(`search=${encodeURIComponent(search)}`);
    const res = await apiService.get(`/users?${q.join('&')}`);
    return (res?.data || res) as any;
  }

  async deleteLead(id: string): Promise<void> {
    return apiService.delete(`${this.basePath}/${id}`);
  }

  async deleteLeadsBulk(ids: string[]): Promise<{ deleted: number; errors: string[] }> {
    return apiService.post(`${this.basePath}/delete-bulk`, { ids });
  }

  async convertLead(id: string): Promise<{ account: any; contact: any; opportunity?: any }> {
    return apiService.post(`${this.basePath}/${id}/convert`);
  }

  async getLeadHistory(id: string): Promise<any[]> {
    return apiService.get(`${this.basePath}/${id}/history`);
  }

  async importCsv(file: File): Promise<any> {
    const form = new FormData();
    form.append('file', file);
    return apiService.post(`${this.basePath}/import-csv`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000, // 5 minutes for large CSV imports
    } as any);
  }

  async listViews(): Promise<LeadView[]> {
    return apiService.get(`${this.basePath}/views`);
  }

  async createView(view: Omit<LeadView, 'id'>): Promise<LeadView> {
    return apiService.post(`${this.basePath}/views`, view);
  }

  async updateView(id: string, view: Partial<LeadView>): Promise<LeadView> {
    return apiService.patch(`${this.basePath}/views/${id}`, view);
  }

  async deleteView(id: string): Promise<void> {
    return apiService.delete(`${this.basePath}/views/${id}`);
  }

  private buildQueryString(params: LeadsQueryParams): string {
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

export const leadsService = new LeadsService();
export default leadsService;