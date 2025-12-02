import { apiService } from './apiService';

export type FieldKey =
  | 'gender'
  | 'highestQualification'
  | 'yearsOfExperience'
  | 'batch'
  | 'nationality'
  | 'motherTongue'
  | 'locationState'
  | 'locationCity'
  | 'leadSource'
  | 'leadSubSource'
  | 'createdFrom'
  | 'program'
  | 'specialization'
  | 'university'
  | 'yearOfCompletion'
  | 'leadStatus'
  | 'leadSubStatus';

export type OptionsMap = Partial<Record<FieldKey, string[]>> & Record<string, string[]>;

class CenterOptionsService {
  async listCenters(q?: string): Promise<{ centerName: string }[]> {
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    return apiService.get(`/admin/centers${qs}`);
  }

  async getMyCenterOptions(): Promise<OptionsMap> {
    return apiService.get('/centers/options');
  }

  async getCenterOptions(centerName: string): Promise<OptionsMap> {
    return apiService.get(`/admin/centers/${encodeURIComponent(centerName)}/options`);
  }

  async updateCenterFieldOptions(centerName: string, fieldKey: string, options: string[]): Promise<any> {
    return apiService.put(`/admin/centers/${encodeURIComponent(centerName)}/options/${encodeURIComponent(fieldKey)}`, { options });
  }
}

export const centerOptionsService = new CenterOptionsService();
export default centerOptionsService;
