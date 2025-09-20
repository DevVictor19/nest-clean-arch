import { BaseUseCase } from '@/core/domain/usecases/base-usecase';
import { Injectable } from '@nestjs/common';
import { ClientRepository } from '../repositories/client-repository';
import { ClientEntity } from '../entities/client-entity';
import { NotFoundError } from '@/core/domain/errors/base-errors';
import { AddressRepository } from '@/modules/addresses/domain/repositories/address-repository';

interface Input {
  clientId: string;
}

type Output = ClientEntity;

@Injectable()
export class FindByIdClientUseCase implements BaseUseCase<Input, Output> {
  constructor(
    private readonly clientRepository: ClientRepository,
    private readonly addressRepository: AddressRepository,
  ) {}

  async execute(input: Input): Promise<Output> {
    const client = await this.clientRepository.findById(input.clientId);
    if (!client) {
      throw new NotFoundError('Client not found');
    }
    const addresses = await this.addressRepository.findByClientId(client.id);
    client.addresses = addresses;

    return client;
  }
}
