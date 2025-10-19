import {
  FindPaginatedParams,
  FilterOperator,
  PaginatedResult,
} from '@/core/domain/repositories/base-paginated-repository';
import { ClientEntity } from '../../../entities';
import { FindPaginatedClientsUseCase } from '../../find-paginated-clients-usecase';
import { ClientRepository } from '../../../repositories';
import { Test } from '@nestjs/testing';

describe('FindPaginatedClientsUseCase', () => {
  let clientRepository: ClientRepository;
  let useCase: FindPaginatedClientsUseCase;

  const input: FindPaginatedParams = {
    page: 1,
    limit: 10,
    filters: [{ field: 'name', value: 'John', operator: FilterOperator.EQ }],
  };

  beforeEach(async () => {
    const clientRepositoryMock = {
      findPaginated: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        FindPaginatedClientsUseCase,
        {
          provide: ClientRepository,
          useValue: clientRepositoryMock,
        },
      ],
    }).compile();

    clientRepository = moduleRef.get(ClientRepository);
    useCase = moduleRef.get(FindPaginatedClientsUseCase);
  });

  it('should return paginated result from repository', async () => {
    const entities: ClientEntity[] = [];
    for (let i = 0; i < 10; i++) {
      entities.push(
        new ClientEntity({
          id: `client-id-${i}`,
          name: `Client ${i}`,
          email: `Email ${i}`,
          phone: `Phone ${i}`,
          addresses: [],
        }),
      );
    }
    const paginatedResult: PaginatedResult<ClientEntity> = {
      limit: 10,
      page: 1,
      total: 10,
      data: entities,
    };

    jest
      .spyOn(clientRepository, 'findPaginated')
      .mockResolvedValue(paginatedResult);

    const result = await useCase.execute(input);

    expect(result).toBe(paginatedResult);
    expect(clientRepository.findPaginated).toHaveBeenCalledWith(input);
  });
});
