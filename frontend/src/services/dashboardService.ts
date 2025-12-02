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

// New role-aware dashboard payloads
export type SuperAdminDashboard = {
  role: 'super-admin';
  totalCenters: number;
  centers: string[];
  centerPerformance: Array<{ centerName: string; totalLeads: number; qualifiedLeads: number; programWise: Array<{ program: string; count: number }> }>;
  leads: { totalLeads: number; qualifiedLeads: number };
}

export type CenterManagerDashboard = {
  role: 'center-manager';
  centerName: string;
  counselorsCount: number;
  leads: { totalLeads: number; qualifiedLeads: number };
  programWise: Array<{ program: string; count: number }>;
  counselorPerformance: Array<{ userId: string; userName: string; totalLeads: number; qualifiedLeads: number }>
}

export type CounselorDashboard = {
  role: 'counselor';
  leads: { totalLeads: number; qualifiedLeads: number };
  programWise: Array<{ program: string; count: number }>;
  followUpsToday: number;
}

export type DashboardStats = SuperAdminDashboard | CenterManagerDashboard | CounselorDashboard;

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

  async getAllStats(): Promise<DashboardStats> {
    // New single endpoint that returns role-aware stats
    return apiService.get('/dashboard/stats');
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;