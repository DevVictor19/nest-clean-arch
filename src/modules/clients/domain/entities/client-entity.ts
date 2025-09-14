import { BaseEntity } from '@/core/domain/entities/base-entity';
import { AddressEntity } from '@/modules/addresses/domain/entities/address-entity';

export class ClientEntity extends BaseEntity {
  name: string;
  email: string;
  phone: string;
  addresses?: AddressEntity[];

  constructor(props: Partial<ClientEntity>) {
    const { id, createdAt, updatedAt, ...rest } = props;
    super({ id, createdAt, updatedAt });
    Object.assign(this, rest);
  }
}
