import {
  BaseEntityProps,
  BaseEntity,
} from '@/core/domain/entities/base-entity';
import { ClientEntity } from '@/modules/clients/domain/entities';

export type AddressProps = BaseEntityProps & {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  complement?: string;
  clientId: string;
  client?: ClientEntity;
};

export class AddressEntity extends BaseEntity {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  complement?: string;
  clientId: string;
  client?: ClientEntity;

  constructor(props: AddressProps) {
    const { id, createdAt, updatedAt, ...rest } = props;
    super({ id, createdAt, updatedAt });
    Object.assign(this, rest);
  }
}
