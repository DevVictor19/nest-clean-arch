import { BadRequestError } from '@/core/domain/errors/base-errors';
import { BaseUseCase } from '@/core/domain/usecases/base-usecase';
import { Injectable } from '@nestjs/common';
import { ClientEntity } from '../entities';
import { ClientRepository } from '../repositories';
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
  name: string;
  email: string;
  phone: string;
  addresses: Address[];
}

type Output = ClientEntity;

enum CreateClientError {
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  PHONE_ALREADY_EXISTS = 'PHONE_ALREADY_EXISTS',
  ZIP_CODE_ALREADY_EXISTS = 'ZIP_CODE_ALREADY_EXISTS',
}

@Injectable()
export class CreateClientUseCase implements BaseUseCase<Input, Output> {
  constructor(
    private readonly clientRepository: ClientRepository,
    private readonly addressService: AddressService,
  ) {}

  async execute(input: Input): Promise<Output> {
    const [clientWithSameEmail, clientWithSamePhone, existentAddresses] =
      await Promise.all([
        this.clientRepository.findByEmail(input.email),
        this.clientRepository.findByPhone(input.phone),
        this.addressService.findByZipCodes(
          input.addresses.map((address) => address.zipCode),
        ),
      ]);

    if (clientWithSameEmail !== null) {
      throw new BadRequestError(
        'Client with same email already exists',
        CreateClientError.EMAIL_ALREADY_EXISTS,
      );
    }

    if (clientWithSamePhone !== null) {
      throw new BadRequestError(
        'Client with same phone already exists',
        CreateClientError.PHONE_ALREADY_EXISTS,
      );
    }

    if (existentAddresses.length > 0) {
      throw new BadRequestError(
        'Some addresses with same zip code already exists',
        CreateClientError.ZIP_CODE_ALREADY_EXISTS,
      );
    }

    const client = new ClientEntity({
      name: input.name,
      email: input.email,
      phone: input.phone,
    });

    await this.clientRepository.create(client);

    const addresses = input.addresses.map((address) => ({
      ...address,
      clientId: client.id,
    }));

    await this.addressService.createMany(addresses);

    return client;
  }
}
