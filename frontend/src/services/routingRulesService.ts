import { apiService } from './apiService';

export type RuleType = 'round_robin' | 'skill_match';

export interface ActiveRule {
  id: string;
  centerName: string;
  ruleType: RuleType;
  activeUntil: string; // ISO
  config: any;
  lastAssignedUserId?: string | null;
  dateEntered: string;
  dateModified: string;
}

export interface StartRulePayload {
  ruleType: RuleType;
  activeUntil: string; // ISO datetime
  config?: {
    maxActiveLeadsPerCounselor?: number; // default 30
    interestToCounselors?: Record<string, string[]>; // e.g. { MBA: [uid1, uid2] }
    languageToCounselors?: Record<string, string[]>; // e.g. { Tamil: [uid3] }
  };
}

class RoutingRulesService {
  private readonly basePath = '/rules';

  async getActive(): Promise<ActiveRule | null> {
    try {
      const res = await apiService.get(`${this.basePath}/active`);
      if (!res) return null;
      return (res?.data || res) as ActiveRule | null;
    } catch {
      return null;
    }
  }

  async startRule(payload: StartRulePayload): Promise<ActiveRule> {
    return apiService.post(`${this.basePath}/start`, payload);
  }

  async stopRule(): Promise<{ stopped: boolean }>{
    return apiService.post(`${this.basePath}/stop`);
  }
}

export const routingRulesService = new RoutingRulesService();
export default routingRulesService;
