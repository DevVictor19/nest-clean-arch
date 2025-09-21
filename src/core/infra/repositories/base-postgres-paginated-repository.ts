import { BaseEntity } from '@/core/domain/entities/base-entity';
import { BasePostgresRepository } from './base-postgres-repository';
import {
  BasePaginatedRepository,
  FindPaginatedParams,
  PaginatedResult,
  FilterOperator,
} from '@/core/domain/repositories';

export abstract class BasePostgresPaginatedRepository<T extends BaseEntity>
  extends BasePostgresRepository<T>
  implements BasePaginatedRepository<T>
{
  async findPaginated(
    params?: FindPaginatedParams,
  ): Promise<PaginatedResult<T>> {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;
    const offset = (page - 1) * limit;

    let query = this.manager(this.tableName);

    if (params?.filters) {
      for (const filter of params.filters) {
        switch (filter.operator) {
          case FilterOperator.IN:
            query = query.whereIn(
              filter.field,
              Array.isArray(filter.value) ? filter.value : [filter.value],
            );
            break;
          case FilterOperator.BETWEEN:
            if (Array.isArray(filter.value) && filter.value.length === 2) {
              query = query.whereBetween(
                filter.field,
                filter.value as unknown as [string | number, string | number],
              );
            }
            break;
          case FilterOperator.LIKE:
            query = query.where(filter.field, 'like', `%${filter.value}%`);
            break;
          case FilterOperator.EQ:
          case FilterOperator.LT:
          case FilterOperator.LTE:
          case FilterOperator.GT:
          case FilterOperator.GTE:
            query = query.where(filter.field, filter.operator, filter.value);
            break;
          default:
            query = query.where(filter.field, filter.operator, filter.value);
        }
      }
    }

    if (params?.sort?.sortBy) {
      query = query.orderBy(params.sort.sortBy, params.sort.sortOrder ?? 'asc');
    }

    const totalQuery = query.clone();
    const totalResult =
      await totalQuery.count<{ count: string }[]>('* as count');
    const total = parseInt(totalResult[0].count, 10);

    const rows = await query.offset(offset).limit(limit).select('*');
    const data = this.toCollection(rows);

    return {
      page,
      limit,
      total,
      data,
    };
  }
}
