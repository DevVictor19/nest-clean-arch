import { BadRequestError } from '@/core/domain/errors/base-errors';
import { BaseUseCase } from '@/core/domain/usecases/base-usecase';
import { AddressEntity } from '@/modules/addresses/domain/entities';
import { AddressRepository } from '@/modules/addresses/domain/repositories';
import { Injectable } from '@nestjs/common';
import { ClientEntity } from '../entities';
import { ClientRepository } from '../repositories';

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
    private readonly addressRepository: AddressRepository,
  ) {}

  async execute(input: Input): Promise<Output> {
    const [clientWithSameEmail, clientWithSamePhone, existentAddresses] =
      await Promise.all([
        this.clientRepository.findByEmail(input.email),
        this.clientRepository.findByPhone(input.phone),
        this.addressRepository.findByZipCodes(
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

    return this.clientRepository.create(client);
  }
}
