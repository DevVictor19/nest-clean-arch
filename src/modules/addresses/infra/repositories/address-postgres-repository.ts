import { BasePostgresPaginatedRepository } from '@/core/infra/repositories';
import { Inject, Injectable } from '@nestjs/common';
import { AddressEntity } from '../../domain/entities';
import { AddressRepository } from '../../domain/repositories';
import {
  Connection,
  type ConnectionManager,
} from '@/core/infra/database/database-module';
import { AddressModel } from '../models';

@Injectable()
export class AddressPostgresRepository
  extends BasePostgresPaginatedRepository<AddressEntity, AddressModel>
  implements AddressRepository
{
  constructor(
    @Inject(Connection)
    manager: ConnectionManager,
  ) {
    super(manager, 'addresses');
  }

  async findByZipCodes(zipCodes: string[]): Promise<AddressEntity[]> {
    const results = await this.manager<AddressModel>(this.tableName)
      .select('*')
      .whereIn('zip_code', zipCodes);
    return this.toCollection(results);
  }

  async findByClientId(clientId: string): Promise<AddressEntity[]> {
    const results = await this.manager<AddressModel>(this.tableName)
      .select('*')
      .where('client_id', clientId);
    return this.toCollection(results);
  }

  async deleteByClientId(clientId: string): Promise<void> {
    await this.manager(this.tableName).where('client_id', clientId).del();
  }

  toModel(entity: AddressEntity): AddressModel {
    return {
      id: entity.id,
      street: entity.street,
      city: entity.city,
      state: entity.state,
      zip_code: entity.zipCode,
      country: entity.country,
      complement: entity.complement,
      client_id: entity.clientId,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    };
  }

  toEntity(data: AddressModel): AddressEntity {
    return new AddressEntity({
      id: data.id,
      street: data.street,
      city: data.city,
      state: data.state,
      zipCode: data.zip_code,
      country: data.country,
      complement: data.complement ?? undefined,
      clientId: data.client_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  }

  toCollection(data: AddressModel[]): AddressEntity[] {
    return data.map((item) => this.toEntity(item));
  }
}
