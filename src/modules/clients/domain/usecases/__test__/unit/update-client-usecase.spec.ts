/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestError,
  NotFoundError,
} from '@/core/domain/errors/base-errors';
import { ClientEntity } from '../../../entities';
import { UpdateClientUseCase } from '../../update-client-usecase';
import { ClientRepository } from '../../../repositories';
import { AddressService } from '@/modules/addresses/domain/services';
import { Test } from '@nestjs/testing';

describe('UpdateClientUseCase', () => {
  let clientRepository: ClientRepository;
  let addressService: AddressService;
  let useCase: UpdateClientUseCase;
  let client: ClientEntity;

  beforeEach(async () => {
    client = new ClientEntity({
      id: 'client-id-1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890',
      addresses: [],
    });

    const clientRepositoryMock = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      update: jest.fn(),
    };

    const addressServiceMock = {
      findByZipCodes: jest.fn(),
      deleteByClientId: jest.fn(),
      createMany: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UpdateClientUseCase,
        {
          provide: ClientRepository,
          useValue: clientRepositoryMock,
        },
        {
          provide: AddressService,
          useValue: addressServiceMock,
        },
      ],
    }).compile();

    clientRepository = moduleRef.get(ClientRepository);
    addressService = moduleRef.get(AddressService);
    useCase = moduleRef.get(UpdateClientUseCase);
  });

  it('should throw NotFoundError if client does not exist', async () => {
    jest.spyOn(clientRepository, 'findById').mockResolvedValue(null);

    await expect(useCase.execute({ clientId: 'not-exist' })).rejects.toThrow(
      NotFoundError,
    );
    await expect(useCase.execute({ clientId: 'not-exist' })).rejects.toThrow(
      'Client not found',
    );
  });

  it('should update name if provided', async () => {
    jest.spyOn(clientRepository, 'findById').mockResolvedValue(client);
    jest.spyOn(clientRepository, 'update').mockResolvedValue(client);

    const input = { clientId: client.id, name: 'Jane Doe' };
    const result = await useCase.execute(input);

    expect(result.name).toBe('Jane Doe');
    expect(clientRepository.update).toHaveBeenCalledWith(client);
  });

  it('should update email if not taken', async () => {
    jest.spyOn(clientRepository, 'findById').mockResolvedValue(client);
    jest.spyOn(clientRepository, 'findByEmail').mockResolvedValue(null);
    jest.spyOn(clientRepository, 'update').mockResolvedValue(client);

    const input = { clientId: client.id, email: 'jane@example.com' };
    const result = await useCase.execute(input);

    expect(result.email).toBe('jane@example.com');
    expect(clientRepository.update).toHaveBeenCalledWith(client);
  });

  it('should throw BadRequestError if email is taken by another client', async () => {
    jest.spyOn(clientRepository, 'findById').mockResolvedValue(client);
    jest
      .spyOn(clientRepository, 'findByEmail')
      .mockResolvedValue({ id: 'other-id' } as ClientEntity);

    const input = { clientId: client.id, email: 'taken@example.com' };

    try {
      await useCase.execute(input);
      fail('Should have thrown BadRequestError');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe('Client with same email already exists');
      expect(error.errorCode).toBe('EMAIL_ALREADY_EXISTS');
    }
  });

  it('should update phone if not taken', async () => {
    jest.spyOn(clientRepository, 'findById').mockResolvedValue(client);
    jest.spyOn(clientRepository, 'findByPhone').mockResolvedValue(null);
    jest.spyOn(clientRepository, 'update').mockResolvedValue(client);

    const input = { clientId: client.id, phone: '9999999999' };
    const result = await useCase.execute(input);

    expect(result.phone).toBe('9999999999');
    expect(clientRepository.update).toHaveBeenCalledWith(client);
  });

  it('should throw BadRequestError if phone is taken by another client', async () => {
    jest.spyOn(clientRepository, 'findById').mockResolvedValue(client);
    jest
      .spyOn(clientRepository, 'findByPhone')
      .mockResolvedValue({ id: 'other-id' } as ClientEntity);

    const input = { clientId: client.id, phone: '8888888888' };

    try {
      await useCase.execute(input);
      fail('Should have thrown BadRequestError');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe('Client with same phone already exists');
      expect(error.errorCode).toBe('PHONE_ALREADY_EXISTS');
    }
  });

  it('should update addresses if zip codes are not taken by another client', async () => {
    jest.spyOn(clientRepository, 'findById').mockResolvedValue(client);
    jest.spyOn(addressService, 'findByZipCodes').mockResolvedValue([]);
    jest.spyOn(clientRepository, 'update').mockResolvedValue(client);
    jest.spyOn(addressService, 'deleteByClientId').mockResolvedValue(undefined);
    jest.spyOn(addressService, 'createMany').mockResolvedValue(undefined);

    const addresses = [
      {
        street: 'Main St',
        city: 'Metropolis',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        complement: 'Apt 101',
      },
    ];
    const input = { clientId: client.id, addresses };

    await useCase.execute(input);

    expect(clientRepository.update).toHaveBeenCalledWith(client);
    expect(addressService.deleteByClientId).toHaveBeenCalledWith(client.id);
    expect(addressService.createMany).toHaveBeenCalledWith([
      {
        street: 'Main St',
        city: 'Metropolis',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        complement: 'Apt 101',
        clientId: client.id,
      },
    ]);
  });

  it('should update multiple fields at once', async () => {
    jest.spyOn(clientRepository, 'findById').mockResolvedValue(client);
    jest.spyOn(clientRepository, 'findByEmail').mockResolvedValue(null);
    jest.spyOn(clientRepository, 'findByPhone').mockResolvedValue(null);
    jest.spyOn(addressService, 'findByZipCodes').mockResolvedValue([]);
    jest.spyOn(clientRepository, 'update').mockResolvedValue(client);
    jest.spyOn(addressService, 'deleteByClientId').mockResolvedValue(undefined);
    jest.spyOn(addressService, 'createMany').mockResolvedValue(undefined);

    const addresses = [
      {
        street: 'Main St',
        city: 'Metropolis',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        complement: 'Apt 101',
      },
    ];
    const input = {
      clientId: client.id,
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '9999999999',
      addresses,
    };

    const result = await useCase.execute(input);

    expect(result.name).toBe('Jane Doe');
    expect(result.email).toBe('jane@example.com');
    expect(result.phone).toBe('9999999999');
    expect(clientRepository.update).toHaveBeenCalledWith(client);
    expect(addressService.deleteByClientId).toHaveBeenCalledWith(client.id);
    expect(addressService.createMany).toHaveBeenCalledWith([
      {
        street: 'Main St',
        city: 'Metropolis',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        complement: 'Apt 101',
        clientId: client.id,
      },
    ]);
  });

  it('should not update anything if no fields provided', async () => {
    jest.spyOn(clientRepository, 'findById').mockResolvedValue(client);
    jest.spyOn(clientRepository, 'update').mockResolvedValue(client);

    const input = { clientId: client.id };
    const result = await useCase.execute(input);

    expect(result).toEqual(client);
    expect(clientRepository.update).toHaveBeenCalledWith(client);
  });

  it('should update only one field if only one provided', async () => {
    jest.spyOn(clientRepository, 'findById').mockResolvedValue(client);
    jest.spyOn(clientRepository, 'update').mockResolvedValue(client);

    const input = { clientId: client.id, name: 'Only Name' };
    const result = await useCase.execute(input);

    expect(result.name).toBe('Only Name');
    expect(result.email).toBe('john@example.com');
    expect(result.phone).toBe('1234567890');
    expect(clientRepository.update).toHaveBeenCalledWith(client);
  });

  it('should throw BadRequestError if any address zip code belongs to another client', async () => {
    jest.spyOn(clientRepository, 'findById').mockResolvedValue(client);
    jest
      .spyOn(addressService, 'findByZipCodes')
      .mockResolvedValue([{ clientId: 'other-id', zipCode: '10001' } as any]);

    const addresses = [
      {
        street: 'Main St',
        city: 'Metropolis',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
      },
    ];
    const input = { clientId: client.id, addresses };

    try {
      await useCase.execute(input);
      fail('Should have thrown BadRequestError');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe('Some addresses belong to another client');
      expect(error.errorCode).toBe('ZIP_CODE_ALREADY_EXISTS');
    }
  });
});
