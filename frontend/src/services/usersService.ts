import { apiService } from './apiService';

export type PresenceState = 'online' | 'offline' | 'in_meeting' | 'on_call';

export interface HierarchyUser {
  id: string;
  userName: string;
  firstName: string;
  lastName: string;
  presence: PresenceState;
}

export interface ManagerWithCounselors {
  centerManager: HierarchyUser & { centerName: string | null };
  counselors: HierarchyUser[];
}

export interface HierarchyResponse {
  data: ManagerWithCounselors[];
}

class UsersService {
  async getHierarchy(): Promise<HierarchyResponse> {
    return apiService.get<HierarchyResponse>('/users/hierarchy');
  }

  async deleteUser(id: string): Promise<{ ok: boolean; deleted?: number; cascaded?: number }> {
    return apiService.delete<{ ok: boolean; deleted?: number; cascaded?: number }>(`/users/${id}`);
  }
}

export const usersService = new UsersService();
export default usersService;
