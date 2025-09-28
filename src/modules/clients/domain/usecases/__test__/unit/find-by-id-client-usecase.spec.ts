/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { AddressEntity } from '@/modules/addresses/domain/entities';
import { ClientEntity } from '../../../entities';
import { FindByIdClientUseCase } from '../../find-by-id-client-usecase';
import { NotFoundError } from '@/core/domain/errors/base-errors';

describe('FindByIdClientUseCase', () => {
  let clientRepository: any;
  let addressService: any;
  let useCase: FindByIdClientUseCase;
  const input = { clientId: 'client-id-1' };

  beforeEach(() => {
    clientRepository = {
      findById: jest.fn(),
    };
    addressService = {
      findByClientId: jest.fn(),
    };
    useCase = new FindByIdClientUseCase(clientRepository, addressService);
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
    addressService.findByClientId.mockResolvedValue(addresses);
    const result = await useCase.execute(input);
    expect(result).toBe(client);
    expect(result.addresses).toBe(addresses);
    expect(clientRepository.findById).toHaveBeenCalledWith(input.clientId);
    expect(addressService.findByClientId).toHaveBeenCalledWith(input.clientId);
  });

  it('should throw NotFoundError when client not found', async () => {
    clientRepository.findById.mockResolvedValue(null);
    await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
    await expect(useCase.execute(input)).rejects.toThrow('Client not found');
  });
});
