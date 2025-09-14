import { BaseEntity } from '../entities/base-entity';
import { BaseRepository } from './base-repository';

export interface FindPaginatedParams {
  page?: number;
  limit?: number;
  sort?: SortOptions;
  filters?: FilterOption[];
}

export interface SortOptions {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterOption {
  field: string;
  operator: FilterOperator;
  value: string | number | boolean;
}

export enum FilterOperator {
  EQ = '=',
  LT = '<',
  LTE = '<=',
  GT = '>',
  GTE = '>=',
  IN = 'in',
  LIKE = 'like',
  BETWEEN = 'between',
}

export interface PaginatedResult<T extends BaseEntity> {
  page: number;
  limit: number;
  total: number;
  data: T[];
}

export abstract class BasePaginatedRepository<
  T extends BaseEntity,
> extends BaseRepository<T> {
  abstract findPaginated(
    params?: FindPaginatedParams,
  ): Promise<PaginatedResult<T>>;
}
