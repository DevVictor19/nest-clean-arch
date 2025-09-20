/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { FindByIdClientUseCase } from '../../find-by-id-client-usecase';
import { NotFoundError } from '@/core/domain/errors/base-errors';
import { ClientEntity } from '../../../entities/client-entity';
import { AddressEntity } from '@/modules/addresses/domain/entities/address-entity';

describe('FindByIdClientUseCase', () => {
  let clientRepository: any;
  let addressRepository: any;
  let useCase: FindByIdClientUseCase;
  const input = { clientId: 'client-id-1' };

  beforeEach(() => {
    clientRepository = {
      findById: jest.fn(),
    };
    addressRepository = {
      findByClientId: jest.fn(),
    };
    useCase = new FindByIdClientUseCase(clientRepository, addressRepository);
  });

  it('should return client with addresses when found', async () => {
    const client = new ClientEntity({
      id: 'client-id-1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890',
      addresses: [],
    });
    const addresses = [
      new AddressEntity({
        street: 'Main St',
        city: 'Metropolis',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        clientId: 'client-id-1',
      }),
    ];
    clientRepository.findById.mockResolvedValue(client);
    addressRepository.findByClientId.mockResolvedValue(addresses);
    const result = await useCase.execute(input);
    expect(result).toBe(client);
    expect(result.addresses).toBe(addresses);
    expect(clientRepository.findById).toHaveBeenCalledWith(input.clientId);
    expect(addressRepository.findByClientId).toHaveBeenCalledWith(
      input.clientId,
    );
  });

  it('should throw NotFoundError when client not found', async () => {
    clientRepository.findById.mockResolvedValue(null);
    await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
    await expect(useCase.execute(input)).rejects.toThrow('Client not found');
  });
});
