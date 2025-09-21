import { BaseEntity } from '@/core/domain/entities/base-entity';
import { type ConnectionManager } from '../database/database-module';
import { BaseRepository } from '@/core/domain/repositories';
import { BaseModel } from '../models';

export abstract class BasePostgresRepository<
  T extends BaseEntity,
  U extends BaseModel,
> implements BaseRepository<T>
{
  constructor(
    protected readonly manager: ConnectionManager,
    protected readonly tableName: string,
  ) {}

  async create(entity: T): Promise<T> {
    const model = this.toModel(entity);
    const result = await this.manager(this.tableName)
      .insert(model)
      .returning('*');
    return this.toEntity(result[0]);
  }

  async createMany(entities: T[]): Promise<void> {
    const models = entities.map((entity) => this.toModel(entity));
    await this.manager(this.tableName).insert(models);
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
    const model = this.toModel(entity);
    model.updatedAt = new Date();
    const result = await this.manager(this.tableName)
      .where({ id: model.id })
      .update(model)
      .returning('*');
    return this.toEntity(result[0]);
  }

  async delete(id: string): Promise<void> {
    await this.manager(this.tableName).where({ id }).del();
  }

  abstract toModel(entity: T): U;
  abstract toEntity(data: any): T;
  abstract toCollection(data: any[]): T[];
}
