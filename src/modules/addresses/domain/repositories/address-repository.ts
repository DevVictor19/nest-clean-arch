import { BasePaginatedRepository } from '@/core/domain/repositories/base-paginated-repository';
import { AddressEntity } from '../entities/address-entity';

export abstract class AddressRepository extends BasePaginatedRepository<AddressEntity> {
  abstract findByZipCodes(zipCodes: string[]): Promise<AddressEntity[]>;
  abstract findByClientId(clientId: string): Promise<AddressEntity[]>;
}
