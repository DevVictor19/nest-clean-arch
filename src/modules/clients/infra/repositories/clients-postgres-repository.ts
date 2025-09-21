/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BasePostgresPaginatedRepository } from '@/core/infra/repositories';
import { ClientEntity } from '../../domain/entities';
import { ClientRepository } from '../../domain/repositories';
import { Inject, Injectable } from '@nestjs/common';
import {
  Connection,
  type ConnectionManager,
} from '@/core/infra/database/database-module';

@Injectable()
export class ClientsPostgresRepository
  extends BasePostgresPaginatedRepository<ClientEntity>
  implements ClientRepository
{
  constructor(
    @Inject(Connection)
    manager: ConnectionManager,
  ) {
    super(manager, 'clients');
  }

  async findByEmail(email: string): Promise<ClientEntity | null> {
    const result = await this.manager(this.tableName).where({ email }).first();
    return result ? this.toEntity(result) : null;
  }

  async findByPhone(phone: string): Promise<ClientEntity | null> {
    const result = await this.manager(this.tableName).where({ phone }).first();
    return result ? this.toEntity(result) : null;
  }

  toEntity(data: any): ClientEntity {
    return new ClientEntity({
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  toCollection(data: any[]): ClientEntity[] {
    return data.map((item) => this.toEntity(item));
  }
}
