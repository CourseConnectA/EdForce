import { apiService } from './apiService';

export interface LeadFieldSetting {
  key: string;
  visible: boolean;
  required: boolean;
}

export interface CenterFieldVisibilityItem {
  key: string;
  label: string;
  enabled: boolean;
}

export interface CenterFieldVisibilityResponse {
  filters: CenterFieldVisibilityItem[];
  columns: CenterFieldVisibilityItem[];
}

// Flattened version for easy access
export interface CenterFieldVisibility {
  key: string;
  filterEnabled: boolean;
  columnEnabled: boolean;
}

class LeadSettingsService {
  private basePath = '/leads/field-settings';
  private centerVisibilityPath = '/leads/center-field-visibility';

  async list(): Promise<LeadFieldSetting[]> {
    return apiService.get(this.basePath);
  }

  async save(settings: Array<Partial<LeadFieldSetting> & { key: string }>): Promise<LeadFieldSetting[]> {
    return apiService.patch(this.basePath, { settings });
  }

  /** Get center-level filter/column visibility settings - transforms API response to flat array */
  async getCenterFieldVisibility(): Promise<CenterFieldVisibility[]> {
    const response: CenterFieldVisibilityResponse = await apiService.get(this.centerVisibilityPath);
    
    // Merge filters and columns into a flat structure
    const map = new Map<string, CenterFieldVisibility>();
    
    // Process filters
    for (const f of response.filters || []) {
      map.set(f.key, { key: f.key, filterEnabled: f.enabled, columnEnabled: true });
    }
    
    // Process columns (update existing or add new)
    for (const c of response.columns || []) {
      const existing = map.get(c.key);
      if (existing) {
        existing.columnEnabled = c.enabled;
      } else {
        map.set(c.key, { key: c.key, filterEnabled: true, columnEnabled: c.enabled });
      }
    }
    
    return Array.from(map.values());
  }

  /** Save center-level filter/column visibility settings (Center Manager only) */
  async saveCenterFieldVisibility(
    settings: Array<{ key: string; filterEnabled?: boolean; columnEnabled?: boolean }>
  ): Promise<CenterFieldVisibility[]> {
    await apiService.patch(this.centerVisibilityPath, { settings });
    // Re-fetch to get the updated state
    return this.getCenterFieldVisibility();
  }
}

export const leadSettingsService = new LeadSettingsService();
export default leadSettingsService;
