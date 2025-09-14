import { BaseEntity } from '../entities/base-entity';

export abstract class BaseRepository<T extends BaseEntity> {
  abstract create(entity: T): Promise<T>;
  abstract findById(id: string): Promise<T | null>;
  abstract findAll(): Promise<T[]>;
  abstract update(entity: T): Promise<T>;
  abstract delete(id: string): Promise<void>;
}
