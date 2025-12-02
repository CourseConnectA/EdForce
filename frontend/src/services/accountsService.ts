import { apiService } from './apiService';

export interface Account {
  id: string;
  name: string;
  accountType?: 'Customer' | 'Prospect' | 'Partner' | 'Reseller' | 'Competitor' | 'Other';
  industry?: string;
  website?: string;
  phoneOffice?: string;
  phoneFax?: string;
  employees?: number;
  annualRevenue?: number;
  rating?: 'Hot' | 'Warm' | 'Cold';
  ownership?: string;
  sicCode?: string;
  parentAccountId?: string;
  billingAddressStreet?: string;
  billingAddressCity?: string;
  billingAddressState?: string;
  billingAddressPostalcode?: string;
  billingAddressCountry?: string;
  shippingAddressStreet?: string;
  shippingAddressCity?: string;
  shippingAddressState?: string;
  shippingAddressPostalcode?: string;
  shippingAddressCountry?: string;
  description?: string;
  assignedUserId?: string;
  campaignId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountDto {
  name: string;
  accountType?: 'Customer' | 'Prospect' | 'Partner' | 'Reseller' | 'Competitor' | 'Other';
  industry?: string;
  website?: string;
  phoneOffice?: string;
  phoneFax?: string;
  employees?: number;
  annualRevenue?: number;
  rating?: 'Hot' | 'Warm' | 'Cold';
  ownership?: string;
  sicCode?: string;
  parentAccountId?: string;
  billingAddressStreet?: string;
  billingAddressCity?: string;
  billingAddressState?: string;
  billingAddressPostalcode?: string;
  billingAddressCountry?: string;
  shippingAddressStreet?: string;
  shippingAddressCity?: string;
  shippingAddressState?: string;
  shippingAddressPostalcode?: string;
  shippingAddressCountry?: string;
  description?: string;
  assignedUserId?: string;
  campaignId?: string;
}

export interface UpdateAccountDto extends Partial<CreateAccountDto> {}

export interface AccountsResponse {
  data: Account[];
  total: number;
  page: number;
  limit: number;
}

export interface AccountsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  accountType?: 'Customer' | 'Prospect' | 'Partner' | 'Reseller' | 'Competitor' | 'Other';
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

class AccountsService {
  private readonly basePath = '/accounts';

  async getAccounts(params?: AccountsQueryParams): Promise<AccountsResponse> {
    const queryString = params ? this.buildQueryString(params) : '';
    return apiService.get(`${this.basePath}${queryString}`);
  }

  async getAccount(id: string): Promise<Account> {
    return apiService.get(`${this.basePath}/${id}`);
  }

  async createAccount(data: CreateAccountDto): Promise<Account> {
    return apiService.post(this.basePath, data);
  }

  async updateAccount(id: string, data: UpdateAccountDto): Promise<Account> {
    return apiService.patch(`${this.basePath}/${id}`, data);
  }

  async deleteAccount(id: string): Promise<void> {
    return apiService.delete(`${this.basePath}/${id}`);
  }

  private buildQueryString(params: AccountsQueryParams): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }
}

export const accountsService = new AccountsService();
export default accountsService;