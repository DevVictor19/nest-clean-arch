import { BasePostgresPaginatedRepository } from '@/core/infra/repositories';
import { ClientEntity } from '../../domain/entities';
import { ClientRepository } from '../../domain/repositories';
import { Inject, Injectable } from '@nestjs/common';
import {
  Connection,
  type ConnectionManager,
} from '@/core/infra/database/database-module';
import { ClientModel } from '../models';

@Injectable()
export class ClientPostgresRepository
  extends BasePostgresPaginatedRepository<ClientEntity, ClientModel>
  implements ClientRepository
{
  constructor(
    @Inject(Connection)
    manager: ConnectionManager,
  ) {
    super(manager, 'clients');
  }

  async findByEmail(email: string): Promise<ClientEntity | null> {
    const result = await this.manager<ClientModel>(this.tableName)
      .where({ email })
      .first();
    return result ? this.toEntity(result) : null;
  }

  async findByPhone(phone: string): Promise<ClientEntity | null> {
    const result = await this.manager<ClientModel>(this.tableName)
      .where({ phone })
      .first();
    return result ? this.toEntity(result) : null;
  }

  toModel(entity: ClientEntity): ClientModel {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      phone: entity.phone,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    };
  }

  toEntity(data: ClientModel): ClientEntity {
    return new ClientEntity({
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  }

  toCollection(data: ClientModel[]): ClientEntity[] {
    return data.map((item) => this.toEntity(item));
  }
}
