import { apiService } from './apiService';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    userName: string;
    firstName: string;
    lastName: string;
    email: string;
    isAdmin: boolean;
    role?: string;
    centerName?: string | null;
  };
  accessToken: string;
  refreshToken: string; // still returned by API, but not persisted client-side anymore
}

export interface RefreshTokenResponse {
  accessToken: string;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    return apiService.post<LoginResponse>('/auth/login', credentials);
  }

  async logout(): Promise<void> {
    await apiService.post('/auth/logout');
  }

  async refreshToken(): Promise<RefreshTokenResponse> {
    return apiService.post<RefreshTokenResponse>('/auth/refresh');
  }

  async getProfile(): Promise<LoginResponse['user']> {
    return apiService.get<LoginResponse['user']>('/auth/profile');
  }

  async createAdmin(): Promise<{ message: string }> {
    return apiService.post<{ message: string }>('/auth/create-admin');
  }

  isTokenValid(token: string): boolean {
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  }

  getStoredTokens(): { accessToken: string | null; refreshToken: string | null } {
    return {
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: null,
    };
  }

  clearTokens(): void {
    localStorage.removeItem('accessToken');
  }
}

export const authService = new AuthService();
export default authService;