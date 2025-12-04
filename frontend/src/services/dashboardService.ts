import { apiService } from './apiService';

export interface AccountStats {
  totalAccounts: number;
  total: number;
  customers: number;
  prospects: number;
  hotAccounts: number;
  avgRevenue: number;
  recentAccounts?: number;
}

export interface LeadStats {
  totalLeads: number;
  convertedLeads: number;
  leadsWithEmail: number;
  leadsWithPhone: number;
  leadsByStatus: Array<{ status: string; count: number }>;
  leadsBySource: Array<{ leadSource: string; count: number }>;
  leadsByIndustry: Array<{ industry: string; count: number }>;
  recentLeads: number;
  conversionPercentage: number;
  emailLeadPercentage: number;
  phoneLeadPercentage: number;
  // Legacy properties for compatibility
  qualifiedLeads?: number;
  conversionRate?: number;
  avgLeadValue?: number;
}

export interface FollowUpLead {
  id: string;
  name: string;
  mobileNumber?: string;
  email?: string;
  leadStatus?: string;
  leadSubStatus?: string;
  nextFollowUpAt?: string;
  program?: string;
  description?: string;
  counselorName?: string;
}

// New role-aware dashboard payloads
export type SuperAdminDashboard = {
  role: 'super-admin';
  totalCenters: number;
  totalCounselors: number;
  leads: { totalLeads: number; qualifiedLeads: number; conversionRate: number };
  centerPerformance: Array<{ 
    centerName: string; 
    totalLeads: number; 
    qualifiedLeads: number; 
    counselorCount: number;
    conversionRate: number;
    leadsThisMonth: number;
  }>;
  statusDistribution: Array<{ status: string; count: number }>;
  leadsTrend: Array<{ date: string; count: number }>;
}

export type CenterManagerDashboard = {
  role: 'center-manager';
  centerName: string;
  counselorsCount: number;
  leads: { totalLeads: number; qualifiedLeads: number };
  programWise: Array<{ program: string; count: number }>;
  counselorPerformance: Array<{ userId: string; userName: string; totalLeads: number; qualifiedLeads: number; followUpsToday: number; overdueFollowUps: number }>;
  // Follow-ups data
  followUpsToday: number;
  overdueFollowUps: number;
  todayFollowUpsList: FollowUpLead[];
  overdueFollowUpsList: FollowUpLead[];
  qualifiedLeadsList: FollowUpLead[];
  selectedCounselorId: string | null;
}

export type CounselorDashboard = {
  role: 'counselor';
  leads: { totalLeads: number; qualifiedLeads: number };
  followUpsToday: number;
  overdueFollowUps: number;
  followUps: FollowUpLead[];
  todayFollowUpsList: FollowUpLead[];
  overdueFollowUpsList: FollowUpLead[];
  qualifiedLeadsList: FollowUpLead[];
  dateFilter: string;
}

export type DashboardStats = SuperAdminDashboard | CenterManagerDashboard | CounselorDashboard;

export type DateFilterType = 'today' | 'yesterday' | 'past_week' | 'past_month' | 'custom';

class DashboardService {
  async getAccountStats(): Promise<AccountStats> {
    try {
      return await apiService.get('/accounts/stats');
    } catch (error) {
      console.error('Error fetching account stats:', error);
      throw error;
    }
  }

  async getLeadStats(): Promise<LeadStats> {
    try {
      return await apiService.get('/leads/statistics');
    } catch (error) {
      console.error('Error fetching lead stats:', error);
      throw error;
    }
  }

  async getAllStats(dateFilter?: DateFilterType, startDate?: string, endDate?: string, counselorId?: string): Promise<DashboardStats> {
    const params = new URLSearchParams();
    if (dateFilter) params.append('dateFilter', dateFilter);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (counselorId) params.append('counselorId', counselorId);
    const query = params.toString();
    return apiService.get(`/dashboard/stats${query ? `?${query}` : ''}`);
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;