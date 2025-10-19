import { AddressEntity } from '@/modules/addresses/domain/entities';
import { ClientEntity } from '../../../entities';
import { FindByIdClientUseCase } from '../../find-by-id-client-usecase';
import { NotFoundError } from '@/core/domain/errors/base-errors';
import { ClientRepository } from '../../../repositories';
import { AddressService } from '@/modules/addresses/domain/services';
import { Test } from '@nestjs/testing';

describe('FindByIdClientUseCase', () => {
  let clientRepository: ClientRepository;
  let addressService: AddressService;
  let useCase: FindByIdClientUseCase;

  const input = { clientId: 'client-id-1' };

  beforeEach(async () => {
    const clientRepositoryMock = {
      findById: jest.fn(),
    };

    const addressServiceMock = {
      findByClientId: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        FindByIdClientUseCase,
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
    useCase = moduleRef.get(FindByIdClientUseCase);
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

    jest.spyOn(clientRepository, 'findById').mockResolvedValue(client);
    jest.spyOn(addressService, 'findByClientId').mockResolvedValue(addresses);

    const result = await useCase.execute(input);

    expect(result).toBe(client);
    expect(result.addresses).toBe(addresses);
    expect(clientRepository.findById).toHaveBeenCalledWith(input.clientId);
    expect(addressService.findByClientId).toHaveBeenCalledWith(input.clientId);
  });

  it('should throw NotFoundError when client not found', async () => {
    jest.spyOn(clientRepository, 'findById').mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
    await expect(useCase.execute(input)).rejects.toThrow('Client not found');
  });
});
