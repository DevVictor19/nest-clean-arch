import { BaseUseCase } from '@/core/domain/usecases/base-usecase';
import { Injectable } from '@nestjs/common';
import { ClientEntity } from '../entities';
import { ClientRepository } from '../repositories';
import { NotFoundError } from '@/core/domain/errors/base-errors';
import { AddressService } from '@/modules/addresses/domain/services';

interface Input {
  clientId: string;
}

type Output = ClientEntity;

@Injectable()
export class FindByIdClientUseCase implements BaseUseCase<Input, Output> {
  constructor(
    private readonly clientRepository: ClientRepository,
    private readonly addressService: AddressService,
  ) {}

  async execute(input: Input): Promise<Output> {
    const client = await this.clientRepository.findById(input.clientId);
    if (!client) {
      throw new NotFoundError('Client not found');
    }
    const addresses = await this.addressService.findByClientId(client.id);
    client.addresses = addresses;

    return client;
  }
}
