// Common types and interfaces
export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface BaseEntity {
  id: string;
  dateEntered: Date;
  dateModified: Date;
  createdBy: string;
  modifiedBy: string;
  deleted: boolean;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  pagination?: Pagination;
}

export interface SearchCriteria {
  query?: string;
  filters?: Record<string, any>;
  sort?: {
    field: string;
    order: 'ASC' | 'DESC';
  };
  pagination?: {
    page: number;
    limit: number;
  };
}

// Export all entity interfaces
export * from './entities';
export * from './dto';
export * from './enums';