import { apiService } from './apiService';

export type ReportScope = 'personal' | 'center';

export interface ReportFolder { id: string; name: string; description?: string | null; centerName?: string | null; createdBy?: string | null; }
export interface ReportRow { id: string; name: string; description?: string | null; folderId?: string | null; reportType: string; scope: ReportScope; centerName?: string | null; createdBy: string; createdByName?: string; createdByFirstName?: string; createdByType?: string; createdByCenter?: string | null; starredBy?: string[]; sharedTo?: string[]; excludedFromCenter?: string[]; dateEntered: string; dateModified: string; }

export interface ReportConfig {
  columns: string[];
  groups?: string[];
  sort?: { field: string; order: 'ASC'|'DESC' };
  filters?: Array<{ field: string; op: string; value: any }>;
  charts?: any[];
}

export interface RunResult { rows: any[]; columns: string[]; }

class ReportsService {
  private readonly base = '/reports';

  // Folders
  listFolders(): Promise<ReportFolder[]> { return apiService.get(`${this.base}/folders`); }
  createFolder(name: string, description?: string) { return apiService.post(`${this.base}/folders`, { name, description }); }
  updateFolder(id: string, patch: Partial<ReportFolder>) { return apiService.patch(`${this.base}/folders/${id}`, patch); }
  deleteFolder(id: string) { return apiService.delete(`${this.base}/folders/${id}`); }

  // Fields
  getFields(type: string) { return apiService.get(`${this.base}/fields?type=${encodeURIComponent(type)}`); }

  // Reports
  list(params: { search?: string; category?: string; createdByMe?: boolean; sharedWithMe?: boolean; all?: boolean; page?: number; limit?: number; sortBy?: string; sortOrder?: 'ASC'|'DESC' } = {}) {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k,v])=>{ if (v !== undefined && v !== null && v !== '') sp.append(k, String(v)); });
    return apiService.get(`${this.base}?${sp.toString()}`);
  }
  get(id: string) {
    return apiService.get(`${this.base}/${id}`);
  }
  create(report: Partial<ReportRow> & { reportType: string; name: string; scope?: ReportScope; config?: ReportConfig }) {
    return apiService.post(this.base, report);
  }
  update(id: string, patch: Partial<ReportRow> & { config?: ReportConfig }) {
    return apiService.patch(`${this.base}/${id}`, patch);
  }
  remove(id: string) { return apiService.delete(`${this.base}/${id}`); }
  star(id: string, starred: boolean) { return apiService.patch(`${this.base}/${id}/star`, { starred }); }

  // Run and charts
  run(reportType: string, config: ReportConfig, preview = true): Promise<RunResult> { return apiService.post(`${this.base}/run`, { reportType, config, preview }); }
  chart(body: any) { return apiService.post(`${this.base}/charts`, body); }

  // Sharing
  share(id: string, body: { target: 'center'|'user'; userId?: string; unshare?: boolean }) {
    return apiService.patch(`${this.base}/${id}/share`, body);
  }

  // Users for sharing (center manager fetch counselors; super-admin fetch center-managers or counselors based on role filter)
  listShareUsers(role?: string, search?: string) {
    const sp = new URLSearchParams();
    if (role) sp.append('role', role);
    if (search) sp.append('search', search);
    sp.append('limit','100');
    return apiService.get(`/users?${sp.toString()}`);
  }
}

export const reportsService = new ReportsService();
export default reportsService;
