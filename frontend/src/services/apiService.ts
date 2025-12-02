import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

class ApiService {
  private instance: AxiosInstance;
  private refreshInstance: AxiosInstance;

  constructor() {
    // Prefer first-party proxy during dev to ensure httpOnly cookies are sent
    const envAny = (import.meta as any).env || {};
    const isDev = !!envAny.DEV;
    const explicit = envAny.VITE_APP_API_URL as string | undefined;
    
    let baseURL = '/api';
    
    // Check if we're on a native platform (mobile app)
    const isNative = typeof (window as any).Capacitor !== 'undefined';
    
    console.log('API Service Init:', { 
      isDev, 
      explicit, 
      isNative,
      platform: isNative ? (window as any).Capacitor.getPlatform() : 'web'
    });
    
    // For production build with explicit URL (mobile app)
    if (explicit) {
      baseURL = explicit;
      console.log('Using explicit API URL:', baseURL);
    } 
    // Fallback: If native platform but no explicit URL, use network IP
    else if (isNative) {
      baseURL = 'http://192.168.0.104:3001/api';
      console.log('Using native fallback API URL:', baseURL);
    }
    // Development mode uses proxy
    else if (isDev) {
      baseURL = '/api';
      console.log('Using dev proxy API URL:', baseURL);
    }

    // Log the final baseURL
    console.log('Final baseURL:', baseURL);
    
    this.instance = axios.create({
      baseURL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    // Bare instance for refresh to avoid interceptor recursion
    this.refreshInstance = axios.create({
      baseURL,
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });
    
    console.log('Axios instance created with baseURL:', this.instance.defaults.baseURL);

    // Request interceptor: attach token; if missing, attempt a pre-emptive refresh
    this.instance.interceptors.request.use(
      async (config) => {
        const token = localStorage.getItem('accessToken');
        const url = config.url || '';
        const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/create-admin') || url.includes('/auth/logout');

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          return config;
        }

        if (isAuthEndpoint) {
          return config; // don't try to refresh for auth endpoints
        }

        // If another refresh is in progress, wait for it and then proceed
        if (isRefreshing && refreshPromise) {
          return new Promise((resolve, reject) => {
            queueRequest((newToken: string) => {
              if (!newToken) return reject(new Error('Unable to obtain token'));
              config.headers.Authorization = `Bearer ${newToken}`;
              resolve(config);
            });
          });
        }

        // Start a refresh before sending the request
        isRefreshing = true;
        refreshPromise = this.refreshInstance.post('/auth/refresh')
          .then((resp) => {
            const { accessToken } = resp.data || {};
            if (accessToken) {
              localStorage.setItem('accessToken', accessToken);
              resolveQueued(accessToken);
              config.headers.Authorization = `Bearer ${accessToken}`;
              return config;
            }
            throw new Error('No access token from refresh');
          })
          .catch(async (refreshError) => {
            localStorage.removeItem('accessToken');
            rejectQueued();
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
            throw refreshError;
          })
          .finally(() => {
            isRefreshing = false;
            refreshPromise = null;
          });

        return refreshPromise;
      },
      (error) => Promise.reject(error)
    );

    // Refresh de-duplication and request queueing
  let isRefreshing = false;
  let refreshPromise: Promise<any> | null = null;
    const queuedRequests: Array<(token: string) => void> = [];
    const queueRequest = (cb: (token: string) => void) => queuedRequests.push(cb);
    const resolveQueued = (token: string) => {
      while (queuedRequests.length) {
        const cb = queuedRequests.shift();
        try { cb && cb(token); } catch {}
      }
    };
    const rejectQueued = () => {
      while (queuedRequests.length) {
        const cb = queuedRequests.shift();
        try { cb && cb(''); } catch {}
      }
    };

    // Response interceptor to handle token refresh
    this.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        const failingUrl: string = originalRequest?.url || '';

        // If the 401 is coming from auth endpoints themselves, don't try to refresh or redirect
        if (failingUrl.includes('/auth/login') || failingUrl.includes('/auth/refresh') || failingUrl.includes('/auth/create-admin')) {
          return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          // If a refresh is already in flight, queue this request to retry when it's done
          if (isRefreshing && refreshPromise) {
            return new Promise((resolve, reject) => {
              queueRequest((token: string) => {
                if (!token) return reject(error);
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(this.instance(originalRequest));
              });
            });
          }

          // Start a new refresh flow
          isRefreshing = true;
          refreshPromise = this.instance.post('/auth/refresh')
            .then((resp) => {
              const { accessToken } = resp.data || {};
              if (accessToken) {
                localStorage.setItem('accessToken', accessToken);
                resolveQueued(accessToken);
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return this.instance(originalRequest);
              }
              throw new Error('No access token from refresh');
            })
            .catch(async (refreshError) => {
              localStorage.removeItem('accessToken');
              rejectQueued();
              if (window.location.pathname !== '/login') {
                window.location.href = '/login';
              }
              throw refreshError;
            })
            .finally(() => {
              isRefreshing = false;
              refreshPromise = null;
            });

          return refreshPromise;
        }

        // Log detailed error information for debugging
        console.error('API Error Details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
          url: error.config?.url,
          method: error.config?.method,
          requestData: error.config?.data
        });

        return Promise.reject(error);
      }
    );
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.get(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.post(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.put(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.patch(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.delete(url, config);
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;