/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  BadRequestError,
  NotFoundError,
} from '@/core/domain/errors/base-errors';
import { AddressEntity } from '@/modules/addresses/domain/entities';
import { ClientEntity } from '../../../entities';
import { UpdateClientUseCase } from '../../update-client-usecase';

describe('UpdateClientUseCase', () => {
  let clientRepository: any;
  let addressService: any;
  let useCase: UpdateClientUseCase;
  let client: ClientEntity;

  beforeEach(() => {
    client = new ClientEntity({
      id: 'client-id-1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890',
      addresses: [],
    });
    clientRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      update: jest.fn(),
    };
    addressService = {
      findByZipCodes: jest.fn(),
      deleteByClientId: jest.fn(),
    };
    useCase = new UpdateClientUseCase(clientRepository, addressService);
  });

  it('should throw NotFoundError if client does not exist', async () => {
    clientRepository.findById.mockResolvedValue(null);
    await expect(useCase.execute({ clientId: 'not-exist' })).rejects.toThrow(
      NotFoundError,
    );
    await expect(useCase.execute({ clientId: 'not-exist' })).rejects.toThrow(
      'Client not found',
    );
  });

  it('should update name if provided', async () => {
    clientRepository.findById.mockResolvedValue(client);
    clientRepository.update.mockResolvedValue(client);
    const input = { clientId: client.id, name: 'Jane Doe' };
    const result = await useCase.execute(input);
    expect(result.name).toBe('Jane Doe');
    expect(clientRepository.update).toHaveBeenCalledWith(client);
  });

  it('should update email if not taken', async () => {
    clientRepository.findById.mockResolvedValue(client);
    clientRepository.findByEmail.mockResolvedValue(null);
    clientRepository.update.mockResolvedValue(client);
    const input = { clientId: client.id, email: 'jane@example.com' };
    const result = await useCase.execute(input);
    expect(result.email).toBe('jane@example.com');
    expect(clientRepository.update).toHaveBeenCalledWith(client);
  });

  it('should throw BadRequestError if email is taken by another client', async () => {
    clientRepository.findById.mockResolvedValue(client);
    clientRepository.findByEmail.mockResolvedValue({ id: 'other-id' });
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
    clientRepository.findById.mockResolvedValue(client);
    clientRepository.findByPhone.mockResolvedValue(null);
    clientRepository.update.mockResolvedValue(client);
    const input = { clientId: client.id, phone: '9999999999' };
    const result = await useCase.execute(input);
    expect(result.phone).toBe('9999999999');
    expect(clientRepository.update).toHaveBeenCalledWith(client);
  });

  it('should throw BadRequestError if phone is taken by another client', async () => {
    clientRepository.findById.mockResolvedValue(client);
    clientRepository.findByPhone.mockResolvedValue({ id: 'other-id' });
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
    clientRepository.findById.mockResolvedValue(client);
    addressService.findByZipCodes.mockResolvedValue([]);
    clientRepository.update.mockResolvedValue(client);
    addressService.deleteByClientId.mockResolvedValue(undefined);
    const addresses = [
      {
        street: 'Main St',
        city: 'Metropolis',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        complement: 'Apt 101',
        clientId: client.id,
      },
    ];
    const input = { clientId: client.id, addresses };
    await useCase.execute(input);
    expect(clientRepository.update).toHaveBeenCalledWith(client);
    expect(addressService.deleteByClientId).toHaveBeenCalledWith(client.id);
  });
  it('should update multiple fields at once', async () => {
    clientRepository.findById.mockResolvedValue(client);
    clientRepository.findByEmail.mockResolvedValue(null);
    clientRepository.findByPhone.mockResolvedValue(null);
    addressService.findByZipCodes.mockResolvedValue([]);
    clientRepository.update.mockResolvedValue(client);
    addressService.deleteByClientId.mockResolvedValue(undefined);
    const addresses = [
      {
        street: 'Main St',
        city: 'Metropolis',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        complement: 'Apt 101',
        clientId: client.id,
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
  });

  it('should not update anything if no fields provided', async () => {
    clientRepository.findById.mockResolvedValue(client);
    clientRepository.update.mockResolvedValue(client);
    const input = { clientId: client.id };
    const result = await useCase.execute(input);
    expect(result).toEqual(client);
    expect(clientRepository.update).toHaveBeenCalledWith(client);
  });

  it('should update only one field if only one provided', async () => {
    clientRepository.findById.mockResolvedValue(client);
    clientRepository.update.mockResolvedValue(client);
    const input = { clientId: client.id, name: 'Only Name' };
    const result = await useCase.execute(input);
    expect(result.name).toBe('Only Name');
    expect(result.email).toBe('john@example.com');
    expect(result.phone).toBe('1234567890');
    expect(clientRepository.update).toHaveBeenCalledWith(client);
  });

  it('should throw BadRequestError if any address zip code belongs to another client', async () => {
    clientRepository.findById.mockResolvedValue(client);
    addressService.findByZipCodes.mockResolvedValue([
      { clientId: 'other-id', zipCode: '10001' },
    ]);
    const addresses = [
      new AddressEntity({
        street: 'Main St',
        city: 'Metropolis',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        clientId: client.id,
      }),
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
