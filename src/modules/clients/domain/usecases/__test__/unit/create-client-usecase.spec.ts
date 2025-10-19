/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { BadRequestError } from '@/core/domain/errors/base-errors';
import { ClientEntity } from '../../../entities';
import { CreateClientUseCase } from '../../create-client-usecase';
import { ClientRepository } from '../../../repositories';
import { AddressService } from '@/modules/addresses/domain/services';
import { Test } from '@nestjs/testing';
import { AddressEntity } from '@/modules/addresses/domain/entities';

describe('CreateClientUseCase', () => {
  let clientRepository: ClientRepository;
  let addressService: AddressService;
  let useCase: CreateClientUseCase;

  const input = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '1234567890',
    addresses: [
      {
        street: 'Main St',
        city: 'Metropolis',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
      },
    ],
  };

  beforeEach(async () => {
    const clientRepositoryMock = {
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      create: jest.fn(),
    };

    const addressServiceMock = {
      findByZipCodes: jest.fn(),
      createMany: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateClientUseCase,
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
    useCase = moduleRef.get(CreateClientUseCase);
  });

  it('should create a client when all checks pass', async () => {
    jest.spyOn(clientRepository, 'findByEmail').mockResolvedValue(null);
    jest.spyOn(clientRepository, 'findByPhone').mockResolvedValue(null);
    jest.spyOn(addressService, 'findByZipCodes').mockResolvedValue([]);
    const createdClient = new ClientEntity({
      name: input.name,
      email: input.email,
      phone: input.phone,
    });
    jest.spyOn(clientRepository, 'create').mockResolvedValue(createdClient);
    jest.spyOn(addressService, 'createMany').mockResolvedValue(undefined);

    const result = await useCase.execute(input);
    expect(result).toBeInstanceOf(ClientEntity);
    expect(result.name).toBe(input.name);
    expect(result.email).toBe(input.email);
    expect(result.phone).toBe(input.phone);
    expect(clientRepository.create).toHaveBeenCalledWith(
      expect.any(ClientEntity),
    );
    expect(addressService.createMany).toHaveBeenCalledWith([
      {
        street: 'Main St',
        city: 'Metropolis',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        clientId: result.id,
      },
    ]);
  });

  it('should throw BadRequestError if email already exists', async () => {
    jest
      .spyOn(clientRepository, 'findByEmail')
      .mockResolvedValue({} as ClientEntity);
    jest.spyOn(clientRepository, 'findByPhone').mockResolvedValue(null);
    jest.spyOn(addressService, 'findByZipCodes').mockResolvedValue([]);

    try {
      await useCase.execute(input);
      fail('Should have thrown BadRequestError');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe('Client with same email already exists');
      expect(error.errorCode).toBe('EMAIL_ALREADY_EXISTS');
    }
  });

  it('should throw BadRequestError if phone already exists', async () => {
    jest.spyOn(clientRepository, 'findByEmail').mockResolvedValue(null);
    jest
      .spyOn(clientRepository, 'findByPhone')
      .mockResolvedValue({} as ClientEntity);
    jest.spyOn(addressService, 'findByZipCodes').mockResolvedValue([]);

    try {
      await useCase.execute(input);
      fail('Should have thrown BadRequestError');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe('Client with same phone already exists');
      expect(error.errorCode).toBe('PHONE_ALREADY_EXISTS');
    }
  });

  it('should throw BadRequestError if address zip code already exists', async () => {
    jest.spyOn(clientRepository, 'findByEmail').mockResolvedValue(null);
    jest.spyOn(clientRepository, 'findByPhone').mockResolvedValue(null);
    jest
      .spyOn(addressService, 'findByZipCodes')
      .mockResolvedValue([{}] as AddressEntity[]);

    try {
      await useCase.execute(input);
      fail('Should have thrown BadRequestError');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe(
        'Some addresses with same zip code already exists',
      );
      expect(error.errorCode).toBe('ZIP_CODE_ALREADY_EXISTS');
    }
  });
});
