import {
  BadRequestError,
  NotFoundError,
} from '@/core/domain/errors/base-errors';
import { BaseUseCase } from '@/core/domain/usecases/base-usecase';
import { Injectable } from '@nestjs/common';
import { ClientEntity } from '../entities';
import { ClientRepository } from '../repositories';
import { AddressEntity } from '@/modules/addresses/domain/entities';
import { AddressService } from '@/modules/addresses/domain/services';

interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  complement?: string;
}

interface Input {
  clientId: string;
  name?: string;
  email?: string;
  phone?: string;
  addresses?: Address[];
}

type Output = ClientEntity;

enum UpdateClientError {
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  PHONE_ALREADY_EXISTS = 'PHONE_ALREADY_EXISTS',
  ZIP_CODE_ALREADY_EXISTS = 'ZIP_CODE_ALREADY_EXISTS',
}

@Injectable()
export class UpdateClientUseCase implements BaseUseCase<Input, Output> {
  constructor(
    private readonly clientRepository: ClientRepository,
    private readonly addressService: AddressService,
  ) {}

  async execute(input: Input): Promise<ClientEntity> {
    const client = await this.clientRepository.findById(input.clientId);
    if (client === null) {
      throw new NotFoundError('Client not found');
    }

    if (input.name !== undefined) client.name = input.name;

    if (input.email !== undefined) {
      const clientWithSameEmail = await this.clientRepository.findByEmail(
        input.email,
      );

      if (
        clientWithSameEmail !== null &&
        clientWithSameEmail.id !== client.id
      ) {
        throw new BadRequestError(
          'Client with same email already exists',
          UpdateClientError.EMAIL_ALREADY_EXISTS,
        );
      }

      client.email = input.email;
    }

    if (input.phone !== undefined) {
      const clientWithSamePhone = await this.clientRepository.findByPhone(
        input.phone,
      );

      if (
        clientWithSamePhone !== null &&
        clientWithSamePhone.id !== client.id
      ) {
        throw new BadRequestError(
          'Client with same phone already exists',
          UpdateClientError.PHONE_ALREADY_EXISTS,
        );
      }

      client.phone = input.phone;
    }

    if (input.addresses !== undefined && input.addresses.length > 0) {
      const zipCodes = input.addresses.map((address) => address.zipCode);
      const addresses = await this.addressService.findByZipCodes(zipCodes);
      const isFromAnotherClient = addresses.some(
        (a) => a.clientId !== client.id,
      );
      if (isFromAnotherClient) {
        throw new BadRequestError(
          'Some addresses belong to another client',
          UpdateClientError.ZIP_CODE_ALREADY_EXISTS,
        );
      }

      await this.addressService.deleteByClientId(client.id);

      client.addresses = input.addresses.map(
        (a) =>
          new AddressEntity({
            street: a.street,
            city: a.city,
            state: a.state,
            zipCode: a.zipCode,
            country: a.country,
            complement: a.complement,
            clientId: client.id,
          }),
      );
    }

    return this.clientRepository.update(client);
  }
}
