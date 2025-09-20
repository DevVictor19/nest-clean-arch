/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { BadRequestError } from '@/core/domain/errors/base-errors';
import { AddressEntity } from '@/modules/addresses/domain/entities';
import { NotFoundError } from 'rxjs';
import { ClientEntity } from '../../../entities';
import { UpdateClientUseCase } from '../../update-client-usecase';

describe('UpdateClientUseCase', () => {
  let clientRepository: any;
  let addressRepository: any;
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
    addressRepository = {
      findByZipCodes: jest.fn(),
    };
    useCase = new UpdateClientUseCase(clientRepository, addressRepository);
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
    addressRepository.findByZipCodes.mockResolvedValue([]);
    clientRepository.update.mockResolvedValue(client);
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
    const result = await useCase.execute(input);
    expect(result.addresses).toBe(addresses);
    expect(clientRepository.update).toHaveBeenCalledWith(client);
  });

  it('should throw BadRequestError if any address zip code belongs to another client', async () => {
    clientRepository.findById.mockResolvedValue(client);
    addressRepository.findByZipCodes.mockResolvedValue([
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
