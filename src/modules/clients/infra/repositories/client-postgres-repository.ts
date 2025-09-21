import { BasePostgresPaginatedRepository } from '@/core/infra/repositories';
import { ClientEntity } from '../../domain/entities';
import { ClientRepository } from '../../domain/repositories';
import { Inject, Injectable } from '@nestjs/common';
import {
  Connection,
  type ConnectionManager,
} from '@/core/infra/database/database-module';
import { ClientModel } from '../models';
import { AddressModel } from '@/modules/addresses/infra/models';

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

  async create(entity: ClientEntity): Promise<ClientEntity> {
    if (entity.addresses && entity.addresses.length > 0) {
      const result = await this.manager.transaction(async (trx) => {
        const [clientRow] = await trx<ClientModel>(this.tableName)
          .insert(this.toModel(entity))
          .returning('*');

        const addresses: AddressModel[] = entity.addresses!.map((address) => ({
          id: address.id,
          street: address.street,
          city: address.city,
          state: address.state,
          zip_code: address.zipCode,
          country: address.country,
          complement: address.complement,
          client_id: entity.id,
          created_at: address.createdAt,
          updated_at: address.updatedAt,
        }));
        await trx<AddressModel>('addresses').insert(addresses);

        return clientRow;
      });
      return this.toEntity(result);
    } else {
      const [clientRow] = await this.manager<ClientModel>(this.tableName)
        .insert(this.toModel(entity))
        .returning('*');
      return this.toEntity(clientRow);
    }
  }

  async update(entity: ClientEntity): Promise<ClientEntity> {
    if (entity.addresses && entity.addresses.length > 0) {
      const result = await this.manager.transaction(async (trx) => {
        const [clientRow] = await trx<ClientModel>(this.tableName)
          .where({ id: entity.id })
          .update({
            name: entity.name,
            email: entity.email,
            phone: entity.phone,
            updated_at: new Date(),
          })
          .returning('*');

        const addresses: AddressModel[] = entity.addresses!.map((address) => ({
          id: address.id,
          street: address.street,
          city: address.city,
          state: address.state,
          zip_code: address.zipCode,
          country: address.country,
          complement: address.complement,
          client_id: clientRow.id,
          created_at: address.createdAt,
          updated_at: address.updatedAt,
        }));
        await trx<AddressModel>('addresses').insert(addresses);

        return clientRow;
      });
      return this.toEntity(result);
    } else {
      const [clientRow] = await this.manager<ClientModel>(this.tableName)
        .where({ id: entity.id })
        .update({
          name: entity.name,
          email: entity.email,
          phone: entity.phone,
          updated_at: new Date(),
        })
        .returning('*');
      return this.toEntity(clientRow);
    }
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
