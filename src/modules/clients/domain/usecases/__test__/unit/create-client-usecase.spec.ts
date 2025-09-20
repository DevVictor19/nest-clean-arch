/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { BadRequestError } from '@/core/domain/errors/base-errors';
import { AddressEntity } from '@/modules/addresses/domain/entities';
import { ClientEntity } from '../../../entities';
import { CreateClientUseCase } from '../../create-client-usecase';

describe('CreateClientUseCase', () => {
  let clientRepository: any;
  let addressRepository: any;
  let useCase: CreateClientUseCase;

  const input = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '1234567890',
    addresses: [
      new AddressEntity({
        street: 'Main St',
        city: 'Metropolis',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        clientId: 'client-id-1',
      }),
    ],
  };

  beforeEach(() => {
    clientRepository = {
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      create: jest.fn(),
    };
    addressRepository = {
      findByZipCodes: jest.fn(),
    };
    useCase = new CreateClientUseCase(clientRepository, addressRepository);
  });

  it('should create a client when all checks pass', async () => {
    clientRepository.findByEmail.mockResolvedValue(null);
    clientRepository.findByPhone.mockResolvedValue(null);
    addressRepository.findByZipCodes.mockResolvedValue([]);
    const createdClient = new ClientEntity({ ...input });
    clientRepository.create.mockResolvedValue(createdClient);

    const result = await useCase.execute(input);
    expect(result).toBe(createdClient);
    expect(clientRepository.create).toHaveBeenCalledWith(
      expect.any(ClientEntity),
    );
  });

  it('should throw BadRequestError if email already exists', async () => {
    clientRepository.findByEmail.mockResolvedValue({});
    clientRepository.findByPhone.mockResolvedValue(null);
    addressRepository.findByZipCodes.mockResolvedValue([]);

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
    addressRepository.findByZipCodes.mockResolvedValue([]);

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
    addressRepository.findByZipCodes.mockResolvedValue([{}]);

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
