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

interface ClientModel {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ClientsPostgresRepository
  extends BasePostgresPaginatedRepository<ClientEntity, ClientModel>
  implements ClientRepository
{
  constructor(
    @Inject(Connection)
    manager: ConnectionManager,
  ) {
    super(manager, 'clients');
  }

  async create(entity: ClientEntity): Promise<ClientEntity> {
    if (entity.addresses && entity.addresses.length > 0) {
      const result = await this.manager.transaction(async (trx) => {
        const [clientRow] = await trx(this.tableName)
          .insert({
            name: entity.name,
            email: entity.email,
            phone: entity.phone,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt,
          })
          .returning('*');

        const addressesToInsert = entity.addresses!.map((address) => ({
          ...address,
          clientId: clientRow.id,
        }));
        await trx('addresses').insert(addressesToInsert);

        return clientRow as Record<string, unknown>;
      });
      return this.toEntity(result);
    } else {
      const [clientRow] = await this.manager(this.tableName)
        .insert({
          name: entity.name,
          email: entity.email,
          phone: entity.phone,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
        })
        .returning('*');
      return this.toEntity(clientRow);
    }
  }

  async update(entity: ClientEntity): Promise<ClientEntity> {
    if (entity.addresses && entity.addresses.length > 0) {
      const result = await this.manager.transaction(async (trx) => {
        const [clientRow] = await trx(this.tableName)
          .where({ id: entity.id })
          .update({
            name: entity.name,
            email: entity.email,
            phone: entity.phone,
            updatedAt: new Date(),
          })
          .returning('*');

        const addressesToInsert = entity.addresses!.map((address) => ({
          ...address,
          clientId: clientRow.id,
        }));
        await trx('addresses').insert(addressesToInsert);

        return clientRow as Record<string, unknown>;
      });
      return this.toEntity(result);
    } else {
      const [clientRow] = await this.manager(this.tableName)
        .where({ id: entity.id })
        .update({
          name: entity.name,
          email: entity.email,
          phone: entity.phone,
          updatedAt: new Date(),
        })
        .returning('*');
      return this.toEntity(clientRow);
    }
  }

  async findByEmail(email: string): Promise<ClientEntity | null> {
    const result = await this.manager(this.tableName).where({ email }).first();
    return result ? this.toEntity(result) : null;
  }

  async findByPhone(phone: string): Promise<ClientEntity | null> {
    const result = await this.manager(this.tableName).where({ phone }).first();
    return result ? this.toEntity(result) : null;
  }

  toModel(entity: ClientEntity): ClientModel {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      phone: entity.phone,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
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
