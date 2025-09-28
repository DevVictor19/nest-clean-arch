import { Injectable } from '@nestjs/common';
import { AddressService } from '../../domain/services';
import { AddressEntity, AddressProps } from '../../domain/entities';
import { AddressRepository } from '../../domain/repositories';

@Injectable()
export class AddressServiceImpl implements AddressService {
  constructor(private readonly addressRepository: AddressRepository) {}

  async findByZipCodes(zipCodes: string[]): Promise<AddressEntity[]> {
    return this.addressRepository.findByZipCodes(zipCodes);
  }

  async findByClientId(clientId: string): Promise<AddressEntity[]> {
    return this.addressRepository.findByClientId(clientId);
  }

  async createMany(props: AddressProps[]): Promise<void> {
    const addresses = props.map((prop) => new AddressEntity(prop));
    await this.addressRepository.createMany(addresses);
  }

  async deleteByClientId(clientId: string): Promise<void> {
    await this.addressRepository.deleteByClientId(clientId);
  }
}
