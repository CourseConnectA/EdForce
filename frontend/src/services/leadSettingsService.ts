import { apiService } from './apiService';

export interface LeadFieldSetting {
  key: string;
  visible: boolean;
  required: boolean;
}

class LeadSettingsService {
  private basePath = '/leads/field-settings';

  async list(): Promise<LeadFieldSetting[]> {
    return apiService.get(this.basePath);
  }

  async save(settings: Array<Partial<LeadFieldSetting> & { key: string }>): Promise<LeadFieldSetting[]> {
    return apiService.patch(this.basePath, { settings });
  }
}

export const leadSettingsService = new LeadSettingsService();
export default leadSettingsService;
