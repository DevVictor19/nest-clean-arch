/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BasePostgresPaginatedRepository } from '@/core/infra/repositories';
import { Inject, Injectable } from '@nestjs/common';
import { AddressEntity } from '../../domain/entities';
import { AddressRepository } from '../../domain/repositories';
import {
  Connection,
  type ConnectionManager,
} from '@/core/infra/database/database-module';

interface AddressModel {
  id: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  complement?: string;
  clientId: string;
  createdAt: Date;
  updatedAt: Date;
}

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
    const results = await this.manager(this.tableName)
      .select('*')
      .whereIn('zip_code', zipCodes);
    return this.toCollection(results);
  }

  async findByClientId(clientId: string): Promise<AddressEntity[]> {
    const results = await this.manager(this.tableName)
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
      zipCode: entity.zipCode,
      country: entity.country,
      complement: entity.complement,
      clientId: entity.clientId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  toEntity(data: any): AddressEntity {
    return new AddressEntity({
      id: data.id,
      street: data.street,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      country: data.country,
      complement: data.complement,
      clientId: data.clientId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  toCollection(data: any[]): AddressEntity[] {
    return data.map((item) => this.toEntity(item));
  }
}
