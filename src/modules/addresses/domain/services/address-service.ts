import { AddressEntity, AddressProps } from '../entities';

export abstract class AddressService {
  abstract findByZipCodes(zipCodes: string[]): Promise<AddressEntity[]>;
  abstract findByClientId(clientId: string): Promise<AddressEntity[]>;
  abstract createMany(props: AddressProps[]): Promise<void>;
  abstract deleteByClientId(clientId: string): Promise<void>;
}
