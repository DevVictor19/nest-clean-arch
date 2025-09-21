import { BaseEntity } from '@/core/domain/entities/base-entity';
import { type ConnectionManager } from '../database/database-module';
import { BaseRepository } from '@/core/domain/repositories';

export abstract class BasePostgresRepository<T extends BaseEntity>
  implements BaseRepository<T>
{
  constructor(
    protected readonly manager: ConnectionManager,
    protected readonly tableName: string,
  ) {}

  async create(entity: T): Promise<T> {
    const result = await this.manager(this.tableName)
      .insert(entity)
      .returning('*');
    return this.toEntity(result[0]);
  }

  async createMany(entities: T[]): Promise<void> {
    await this.manager(this.tableName).insert(entities);
  }

  async findById(id: string): Promise<T | null> {
    const row: unknown = await this.manager(this.tableName)
      .where({ id })
      .first();
    return row ? this.toEntity(row) : null;
  }

  async findAll(): Promise<T[]> {
    const rows = await this.manager(this.tableName).select('*');
    return this.toCollection(rows);
  }

  async update(entity: T): Promise<T> {
    entity.updatedAt = new Date();
    const result = await this.manager(this.tableName)
      .where({ id: entity.id })
      .update(entity)
      .returning('*');
    return this.toEntity(result[0]);
  }

  async delete(id: string): Promise<void> {
    await this.manager(this.tableName).where({ id }).del();
  }

  abstract toEntity(data: any): T;
  abstract toCollection(data: any[]): T[];
}
