import { apiService } from './apiService';

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email1?: string;
  email2?: string;
  phoneWork?: string;
  phoneMobile?: string;
  phoneHome?: string;
  title?: string;
  department?: string;
  accountId?: string;
  account?: {
    id: string;
    name: string;
  };
  primaryAddressStreet?: string;
  primaryAddressCity?: string;
  primaryAddressState?: string;
  primaryAddressCountry?: string;
  primaryAddressPostalcode?: string;
  leadSource?: string;
  birthdate?: string;
  assistant?: string;
  assistantPhone?: string;
  reportsToId?: string;
  assignedUserId?: string;
  doNotCall?: boolean;
  emailOptOut?: boolean;
  invalidEmail?: boolean;
  description?: string;
  dateEntered: string;
  dateModified: string;
}

export interface CreateContactDto {
  firstName: string;
  lastName: string;
  accountId?: string;
  title?: string;
  department?: string;
  phoneWork?: string;
  phoneMobile?: string;
  phoneHome?: string;
  email1?: string;
  email2?: string;
  emailOptOut?: boolean;
  invalidEmail?: boolean;
  primaryAddressStreet?: string;
  primaryAddressCity?: string;
  primaryAddressState?: string;
  primaryAddressPostalcode?: string;
  primaryAddressCountry?: string;
  leadSource?: string;
  birthdate?: Date;
  assistant?: string;
  assistantPhone?: string;
  reportsToId?: string;
  assignedUserId?: string;
  doNotCall?: boolean;
  description?: string;
}

export interface UpdateContactDto extends Partial<CreateContactDto> {}

export interface ContactsResponse {
  data: Contact[];
  total: number;
  page: number;
  limit: number;
}

export interface ContactsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  accountId?: string;
  department?: string;
  leadSource?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class ContactsService {
  private readonly basePath = '/contacts';

  async getContacts(params?: ContactsQueryParams): Promise<ContactsResponse> {
    const queryString = params ? this.buildQueryString(params) : '';
    return apiService.get(`${this.basePath}${queryString}`);
  }

  async getContact(id: string): Promise<Contact> {
    return apiService.get(`${this.basePath}/${id}`);
  }

  async getContactsByAccount(accountId: string, params?: Omit<ContactsQueryParams, 'accountId'>): Promise<ContactsResponse> {
    const queryString = params ? this.buildQueryString(params as ContactsQueryParams) : '';
    return apiService.get(`${this.basePath}/by-account/${accountId}${queryString}`);
  }

  async createContact(data: CreateContactDto): Promise<Contact> {
    return apiService.post(this.basePath, data);
  }

  async updateContact(id: string, data: UpdateContactDto): Promise<Contact> {
    return apiService.patch(`${this.basePath}/${id}`, data);
  }

  async deleteContact(id: string): Promise<void> {
    return apiService.delete(`${this.basePath}/${id}`);
  }

  private buildQueryString(params: ContactsQueryParams): string {
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

export const contactsService = new ContactsService();
export default contactsService;