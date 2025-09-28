/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { BadRequestError } from '@/core/domain/errors/base-errors';
import { ClientEntity } from '../../../entities';
import { CreateClientUseCase } from '../../create-client-usecase';

describe('CreateClientUseCase', () => {
  let clientRepository: any;
  let addressService: any;
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

  beforeEach(() => {
    clientRepository = {
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      create: jest.fn(),
    };
    addressService = {
      findByZipCodes: jest.fn(),
      createMany: jest.fn(),
    };
    useCase = new CreateClientUseCase(clientRepository, addressService);
  });

  it('should create a client when all checks pass', async () => {
    clientRepository.findByEmail.mockResolvedValue(null);
    clientRepository.findByPhone.mockResolvedValue(null);
    addressService.findByZipCodes.mockResolvedValue([]);
    const createdClient = new ClientEntity({
      name: input.name,
      email: input.email,
      phone: input.phone,
    });
    clientRepository.create.mockResolvedValue(createdClient);
    addressService.createMany.mockResolvedValue(undefined);

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
    clientRepository.findByEmail.mockResolvedValue({});
    clientRepository.findByPhone.mockResolvedValue(null);
    addressService.findByZipCodes.mockResolvedValue([]);

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
    clientRepository.findByEmail.mockResolvedValue(null);
    clientRepository.findByPhone.mockResolvedValue({});
    addressService.findByZipCodes.mockResolvedValue([]);

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
    clientRepository.findByEmail.mockResolvedValue(null);
    clientRepository.findByPhone.mockResolvedValue(null);
    addressService.findByZipCodes.mockResolvedValue([{}]);

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
