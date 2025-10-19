import { ClientRepository } from '../../../repositories';
import { Knex } from 'knex';
import {
  cleanupDatabaseContainer,
  cleanupTables,
  initDatabaseContainer,
} from '@/core/infra/tests';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Test } from '@nestjs/testing';
import { Connection } from '@/core/infra/database/database-module';
import { FindPaginatedClientsUseCase } from '../../find-paginated-clients-usecase';
import { ClientPostgresRepository } from '@/modules/clients/infra/repositories';
import { ClientEntity } from '../../../entities';
import { ClientModel } from '@/modules/clients/infra/models';
import {
  FilterOperator,
  FindPaginatedParams,
} from '@/core/domain/repositories/base-paginated-repository';

describe('FindPaginatedClientsUseCase Integration Tests', () => {
  let findPaginatedClientsUseCase: FindPaginatedClientsUseCase;
  let clientRepository: ClientRepository;
  let knexInstance: Knex;
  let container: StartedPostgreSqlContainer;

  beforeAll(async () => {
    const instance = await initDatabaseContainer();
    container = instance.container;
    knexInstance = instance.knexInstance;

    const moduleRef = await Test.createTestingModule({
      providers: [
        FindPaginatedClientsUseCase,
        {
          provide: ClientRepository,
          useClass: ClientPostgresRepository,
        },
        {
          provide: Connection,
          useValue: knexInstance,
        },
      ],
    }).compile();

    findPaginatedClientsUseCase = moduleRef.get<FindPaginatedClientsUseCase>(
      FindPaginatedClientsUseCase,
    );
    clientRepository = moduleRef.get<ClientRepository>(ClientRepository);
  }, 30000);

  afterAll(async () => {
    await cleanupDatabaseContainer(container, knexInstance);
  });

  beforeEach(async () => {
    await cleanupTables(knexInstance);
  });

  describe('execute - Success Cases', () => {
    it('should return empty result when no clients exist', async () => {
      const params: FindPaginatedParams = {
        page: 1,
        limit: 10,
      };

      const result = await findPaginatedClientsUseCase.execute(params);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should return all clients when they fit in one page', async () => {
      for (let i = 1; i <= 5; i++) {
        const client = new ClientEntity({
          name: `Client ${i}`,
          email: `client${i}@example.com`,
          phone: `1100000000${i}`,
        });
        await clientRepository.create(client);
      }

      const params: FindPaginatedParams = {
        page: 1,
        limit: 10,
      };

      const result = await findPaginatedClientsUseCase.execute(params);

      expect(result.data).toHaveLength(5);
      expect(result.total).toBe(5);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.data[0]).toBeInstanceOf(ClientEntity);
    });

    it('should paginate clients correctly', async () => {
      for (let i = 1; i <= 25; i++) {
        const client = new ClientEntity({
          name: `Client ${i.toString().padStart(2, '0')}`,
          email: `client${i}@example.com`,
          phone: `11${i.toString().padStart(9, '0')}`,
        });
        await clientRepository.create(client);
      }

      const page1Result = await findPaginatedClientsUseCase.execute({
        page: 1,
        limit: 10,
      });

      expect(page1Result.data).toHaveLength(10);
      expect(page1Result.total).toBe(25);
      expect(page1Result.page).toBe(1);
      expect(page1Result.limit).toBe(10);

      const page2Result = await findPaginatedClientsUseCase.execute({
        page: 2,
        limit: 10,
      });

      expect(page2Result.data).toHaveLength(10);
      expect(page2Result.total).toBe(25);
      expect(page2Result.page).toBe(2);
      expect(page2Result.limit).toBe(10);

      const page3Result = await findPaginatedClientsUseCase.execute({
        page: 3,
        limit: 10,
      });

      expect(page3Result.data).toHaveLength(5);
      expect(page3Result.total).toBe(25);
      expect(page3Result.page).toBe(3);
      expect(page3Result.limit).toBe(10);

      const page1Ids = page1Result.data.map((c) => c.id);
      const page2Ids = page2Result.data.map((c) => c.id);
      const page3Ids = page3Result.data.map((c) => c.id);

      const allIds = [...page1Ids, ...page2Ids, ...page3Ids];
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(25);
    });

    it('should filter clients by name using EQ operator', async () => {
      await clientRepository.create(
        new ClientEntity({
          name: 'João Silva',
          email: 'joao@example.com',
          phone: '11111111111',
        }),
      );
      await clientRepository.create(
        new ClientEntity({
          name: 'Maria Santos',
          email: 'maria@example.com',
          phone: '22222222222',
        }),
      );
      await clientRepository.create(
        new ClientEntity({
          name: 'João Oliveira',
          email: 'joao2@example.com',
          phone: '33333333333',
        }),
      );

      const params: FindPaginatedParams = {
        page: 1,
        limit: 10,
        filters: [
          {
            field: 'name',
            operator: FilterOperator.EQ,
            value: 'João Silva',
          },
        ],
      };

      const result = await findPaginatedClientsUseCase.execute(params);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].name).toBe('João Silva');
    });

    it('should filter clients by email using LIKE operator', async () => {
      await clientRepository.create(
        new ClientEntity({
          name: 'Client 1',
          email: 'john.doe@gmail.com',
          phone: '11111111111',
        }),
      );
      await clientRepository.create(
        new ClientEntity({
          name: 'Client 2',
          email: 'jane.smith@gmail.com',
          phone: '22222222222',
        }),
      );
      await clientRepository.create(
        new ClientEntity({
          name: 'Client 3',
          email: 'bob@yahoo.com',
          phone: '33333333333',
        }),
      );

      const params: FindPaginatedParams = {
        page: 1,
        limit: 10,
        filters: [
          {
            field: 'email',
            operator: FilterOperator.LIKE,
            value: '%gmail%',
          },
        ],
      };

      const result = await findPaginatedClientsUseCase.execute(params);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.data.every((c) => c.email.includes('gmail'))).toBe(true);
    });

    it('should sort clients by name in ascending order', async () => {
      await clientRepository.create(
        new ClientEntity({
          name: 'Zebra Client',
          email: 'zebra@example.com',
          phone: '11111111111',
        }),
      );
      await clientRepository.create(
        new ClientEntity({
          name: 'Alpha Client',
          email: 'alpha@example.com',
          phone: '22222222222',
        }),
      );
      await clientRepository.create(
        new ClientEntity({
          name: 'Beta Client',
          email: 'beta@example.com',
          phone: '33333333333',
        }),
      );

      const params: FindPaginatedParams = {
        page: 1,
        limit: 10,
        sort: {
          sortBy: 'name',
          sortOrder: 'asc',
        },
      };

      const result = await findPaginatedClientsUseCase.execute(params);

      expect(result.data).toHaveLength(3);
      expect(result.data[0].name).toBe('Alpha Client');
      expect(result.data[1].name).toBe('Beta Client');
      expect(result.data[2].name).toBe('Zebra Client');
    });

    it('should sort clients by name in descending order', async () => {
      await clientRepository.create(
        new ClientEntity({
          name: 'Zebra Client',
          email: 'zebra@example.com',
          phone: '11111111111',
        }),
      );
      await clientRepository.create(
        new ClientEntity({
          name: 'Alpha Client',
          email: 'alpha@example.com',
          phone: '22222222222',
        }),
      );
      await clientRepository.create(
        new ClientEntity({
          name: 'Beta Client',
          email: 'beta@example.com',
          phone: '33333333333',
        }),
      );

      const params: FindPaginatedParams = {
        page: 1,
        limit: 10,
        sort: {
          sortBy: 'name',
          sortOrder: 'desc',
        },
      };

      const result = await findPaginatedClientsUseCase.execute(params);

      expect(result.data).toHaveLength(3);
      expect(result.data[0].name).toBe('Zebra Client');
      expect(result.data[1].name).toBe('Beta Client');
      expect(result.data[2].name).toBe('Alpha Client');
    });

    it('should combine filters and sorting', async () => {
      for (let i = 1; i <= 10; i++) {
        await clientRepository.create(
          new ClientEntity({
            name: `Test Client ${i.toString().padStart(2, '0')}`,
            email: `test${i}@example.com`,
            phone: `11${i.toString().padStart(9, '0')}`,
          }),
        );
      }

      await clientRepository.create(
        new ClientEntity({
          name: 'Other Client',
          email: 'other@example.com',
          phone: '99999999999',
        }),
      );

      const params: FindPaginatedParams = {
        page: 1,
        limit: 5,
        filters: [
          {
            field: 'name',
            operator: FilterOperator.LIKE,
            value: '%Test%',
          },
        ],
        sort: {
          sortBy: 'name',
          sortOrder: 'desc',
        },
      };

      const result = await findPaginatedClientsUseCase.execute(params);

      expect(result.data).toHaveLength(5);
      expect(result.total).toBe(10);
      expect(result.data[0].name).toBe('Test Client 10');
      expect(result.data.every((c) => c.name.includes('Test'))).toBe(true);
    });

    it('should combine pagination with filters', async () => {
      for (let i = 1; i <= 15; i++) {
        await clientRepository.create(
          new ClientEntity({
            name: `Premium Client ${i}`,
            email: `premium${i}@example.com`,
            phone: `11${i.toString().padStart(9, '0')}`,
          }),
        );
      }

      for (let i = 1; i <= 5; i++) {
        await clientRepository.create(
          new ClientEntity({
            name: `Regular Client ${i}`,
            email: `regular${i}@example.com`,
            phone: `22${i.toString().padStart(9, '0')}`,
          }),
        );
      }

      const params: FindPaginatedParams = {
        page: 2,
        limit: 5,
        filters: [
          {
            field: 'name',
            operator: FilterOperator.LIKE,
            value: '%Premium%',
          },
        ],
      };

      const result = await findPaginatedClientsUseCase.execute(params);

      expect(result.data).toHaveLength(5);
      expect(result.total).toBe(15);
      expect(result.page).toBe(2);
      expect(result.data.every((c) => c.name.includes('Premium'))).toBe(true);
    });

    it('should handle different page sizes', async () => {
      for (let i = 1; i <= 30; i++) {
        await clientRepository.create(
          new ClientEntity({
            name: `Client ${i}`,
            email: `client${i}@example.com`,
            phone: `11${i.toString().padStart(9, '0')}`,
          }),
        );
      }

      const result5 = await findPaginatedClientsUseCase.execute({
        page: 1,
        limit: 5,
      });
      expect(result5.data).toHaveLength(5);
      expect(result5.total).toBe(30);

      const result20 = await findPaginatedClientsUseCase.execute({
        page: 1,
        limit: 20,
      });
      expect(result20.data).toHaveLength(20);
      expect(result20.total).toBe(30);

      const result50 = await findPaginatedClientsUseCase.execute({
        page: 1,
        limit: 50,
      });
      expect(result50.data).toHaveLength(30);
      expect(result50.total).toBe(30);
    });
  });

  describe('execute - Error Cases', () => {
    it('should return empty result when page exceeds total pages', async () => {
      for (let i = 1; i <= 5; i++) {
        await clientRepository.create(
          new ClientEntity({
            name: `Client ${i}`,
            email: `client${i}@example.com`,
            phone: `11${i.toString().padStart(9, '0')}`,
          }),
        );
      }

      const params: FindPaginatedParams = {
        page: 10,
        limit: 10,
      };

      const result = await findPaginatedClientsUseCase.execute(params);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(5);
      expect(result.page).toBe(10);
      expect(result.limit).toBe(10);
    });

    it('should return empty result when filter matches no clients', async () => {
      await clientRepository.create(
        new ClientEntity({
          name: 'João Silva',
          email: 'joao@example.com',
          phone: '11111111111',
        }),
      );
      await clientRepository.create(
        new ClientEntity({
          name: 'Maria Santos',
          email: 'maria@example.com',
          phone: '22222222222',
        }),
      );

      const params: FindPaginatedParams = {
        page: 1,
        limit: 10,
        filters: [
          {
            field: 'name',
            operator: FilterOperator.EQ,
            value: 'NonExistentName',
          },
        ],
      };

      const result = await findPaginatedClientsUseCase.execute(params);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle multiple filters with no matches', async () => {
      await clientRepository.create(
        new ClientEntity({
          name: 'João Silva',
          email: 'joao@example.com',
          phone: '11111111111',
        }),
      );

      const params: FindPaginatedParams = {
        page: 1,
        limit: 10,
        filters: [
          {
            field: 'name',
            operator: FilterOperator.LIKE,
            value: '%João%',
          },
          {
            field: 'email',
            operator: FilterOperator.LIKE,
            value: '%maria%',
          },
        ],
      };

      const result = await findPaginatedClientsUseCase.execute(params);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('execute - Edge Cases', () => {
    it('should handle page 1 with limit 1', async () => {
      for (let i = 1; i <= 5; i++) {
        await clientRepository.create(
          new ClientEntity({
            name: `Client ${i}`,
            email: `client${i}@example.com`,
            phone: `11${i.toString().padStart(9, '0')}`,
          }),
        );
      }

      const params: FindPaginatedParams = {
        page: 1,
        limit: 1,
      };

      const result = await findPaginatedClientsUseCase.execute(params);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(5);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(1);
    });

    it('should maintain consistency across multiple queries', async () => {
      for (let i = 1; i <= 20; i++) {
        await clientRepository.create(
          new ClientEntity({
            name: `Client ${i}`,
            email: `client${i}@example.com`,
            phone: `11${i.toString().padStart(9, '0')}`,
          }),
        );
      }

      const params: FindPaginatedParams = {
        page: 1,
        limit: 10,
      };

      const result1 = await findPaginatedClientsUseCase.execute(params);
      const result2 = await findPaginatedClientsUseCase.execute(params);
      const result3 = await findPaginatedClientsUseCase.execute(params);

      expect(result1.total).toBe(result2.total);
      expect(result2.total).toBe(result3.total);
      expect(result1.data).toHaveLength(result2.data.length);
      expect(result2.data).toHaveLength(result3.data.length);
    });

    it('should handle sorting by created_at', async () => {
      const client1 = new ClientEntity({
        name: 'First Client',
        email: 'first@example.com',
        phone: '11111111111',
      });
      await clientRepository.create(client1);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const client2 = new ClientEntity({
        name: 'Second Client',
        email: 'second@example.com',
        phone: '22222222222',
      });
      await clientRepository.create(client2);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const client3 = new ClientEntity({
        name: 'Third Client',
        email: 'third@example.com',
        phone: '33333333333',
      });
      await clientRepository.create(client3);

      const params: FindPaginatedParams = {
        page: 1,
        limit: 10,
        sort: {
          sortBy: 'created_at',
          sortOrder: 'desc',
        },
      };

      const result = await findPaginatedClientsUseCase.execute(params);

      expect(result.data).toHaveLength(3);
      expect(result.data[0].name).toBe('Third Client');
      expect(result.data[2].name).toBe('First Client');
    });

    it('should verify data returned matches database', async () => {
      const clients: ClientEntity[] = [];
      for (let i = 1; i <= 5; i++) {
        const client = new ClientEntity({
          name: `Client ${i}`,
          email: `client${i}@example.com`,
          phone: `11${i.toString().padStart(9, '0')}`,
        });
        await clientRepository.create(client);
        clients.push(client);
      }

      const params: FindPaginatedParams = {
        page: 1,
        limit: 10,
      };

      const result = await findPaginatedClientsUseCase.execute(params);

      const clientsInDb = await knexInstance<ClientModel>('clients')
        .select()
        .orderBy('created_at', 'asc');

      expect(result.data).toHaveLength(clientsInDb.length);
      expect(result.total).toBe(clientsInDb.length);

      result.data.forEach((client, index) => {
        expect(client.id).toBe(clientsInDb[index].id);
        expect(client.name).toBe(clientsInDb[index].name);
        expect(client.email).toBe(clientsInDb[index].email);
        expect(client.phone).toBe(clientsInDb[index].phone);
      });
    });

    it('should handle complex filter combinations', async () => {
      await clientRepository.create(
        new ClientEntity({
          name: 'João Silva Premium',
          email: 'joao@premium.com',
          phone: '11111111111',
        }),
      );
      await clientRepository.create(
        new ClientEntity({
          name: 'Maria Santos Premium',
          email: 'maria@premium.com',
          phone: '22222222222',
        }),
      );
      await clientRepository.create(
        new ClientEntity({
          name: 'João Oliveira Regular',
          email: 'joao@regular.com',
          phone: '33333333333',
        }),
      );
      await clientRepository.create(
        new ClientEntity({
          name: 'Ana Costa Premium',
          email: 'ana@premium.com',
          phone: '44444444444',
        }),
      );

      const params: FindPaginatedParams = {
        page: 1,
        limit: 10,
        filters: [
          {
            field: 'name',
            operator: FilterOperator.LIKE,
            value: '%Premium%',
          },
          {
            field: 'email',
            operator: FilterOperator.LIKE,
            value: '%premium%',
          },
        ],
      };

      const result = await findPaginatedClientsUseCase.execute(params);

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(
        result.data.every(
          (c) => c.name.includes('Premium') && c.email.includes('premium'),
        ),
      ).toBe(true);
    });

    it('should handle case sensitivity in filters correctly', async () => {
      await clientRepository.create(
        new ClientEntity({
          name: 'UPPERCASE CLIENT',
          email: 'upper@example.com',
          phone: '11111111111',
        }),
      );
      await clientRepository.create(
        new ClientEntity({
          name: 'lowercase client',
          email: 'lower@example.com',
          phone: '22222222222',
        }),
      );
      await clientRepository.create(
        new ClientEntity({
          name: 'MixedCase Client',
          email: 'mixed@example.com',
          phone: '33333333333',
        }),
      );

      const params: FindPaginatedParams = {
        page: 1,
        limit: 10,
        filters: [
          {
            field: 'name',
            operator: FilterOperator.LIKE,
            value: '%client%',
          },
        ],
      };

      const result = await findPaginatedClientsUseCase.execute(params);

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });
  });
});
