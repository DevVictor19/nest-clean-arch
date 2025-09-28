import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { knex, Knex } from 'knex';
import { ClientPostgresRepository } from '../client-postgres-repository';
import { ClientEntity } from '../../../domain/entities';
import { ClientModel } from '../../models';
import {
  FilterOperator,
  FindPaginatedParams,
} from '@/core/domain/repositories/base-paginated-repository';

describe('ClientPostgresRepository Integration Tests', () => {
  let container: StartedPostgreSqlContainer;
  let knexInstance: Knex;
  let repository: ClientPostgresRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17.6-alpine')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .start();

    knexInstance = knex({
      client: 'pg',
      connection: {
        host: container.getHost(),
        port: container.getPort(),
        user: container.getUsername(),
        password: container.getPassword(),
        database: container.getDatabase(),
      },
    });

    await knexInstance.schema.createTable('clients', (table) => {
      table.uuid('id').primary();
      table.string('name').notNullable();
      table.string('email').unique().notNullable();
      table.string('phone').unique().notNullable();
      table
        .timestamp('created_at')
        .notNullable()
        .defaultTo(knexInstance.fn.now());
      table
        .timestamp('updated_at')
        .notNullable()
        .defaultTo(knexInstance.fn.now());
    });

    repository = new ClientPostgresRepository(knexInstance);
  }, 30000);

  afterAll(async () => {
    if (knexInstance) {
      await knexInstance.destroy();
    }
    if (container) {
      await container.stop();
    }
  });

  beforeEach(async () => {
    await knexInstance('clients').del();
  });

  const createTestClients = async () => {
    const clients = [
      new ClientEntity({
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
      }),
      new ClientEntity({
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        phone: '+1234567891',
      }),
      new ClientEntity({
        name: 'Bob Johnson',
        email: 'bob.johnson@example.com',
        phone: '+1234567892',
      }),
      new ClientEntity({
        name: 'Alice Brown',
        email: 'alice.brown@example.com',
        phone: '+1234567893',
      }),
    ];

    for (const client of clients) {
      await repository.create(client);
    }

    return clients;
  };

  describe('create', () => {
    it('should create a client without addresses', async () => {
      const clientData = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
      };
      const client = new ClientEntity(clientData);

      const result = await repository.create(client);

      expect(result).toBeInstanceOf(ClientEntity);
      expect(result.id).toBeDefined();
      expect(result.name).toBe(clientData.name);
      expect(result.email).toBe(clientData.email);
      expect(result.phone).toBe(clientData.phone);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);

      const dbRecord = await knexInstance<ClientModel>('clients')
        .where({ id: result.id })
        .first();
      expect(dbRecord).toBeDefined();
      expect(dbRecord!.name).toBe(clientData.name);
      expect(dbRecord!.email).toBe(clientData.email);
      expect(dbRecord!.phone).toBe(clientData.phone);
    });

    it('should handle unique constraint violations', async () => {
      const client1 = new ClientEntity({
        name: 'John Doe',
        email: 'duplicate@example.com',
        phone: '+1234567890',
      });
      const client2 = new ClientEntity({
        name: 'Jane Doe',
        email: 'duplicate@example.com',
        phone: '+1234567891',
      });

      await repository.create(client1);

      await expect(repository.create(client2)).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update a client without addresses', async () => {
      const client = new ClientEntity({
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
      });
      const createdClient = await repository.create(client);

      createdClient.name = 'John Smith';
      createdClient.email = 'john.smith@example.com';
      createdClient.phone = '+9876543210';

      const result = await repository.update(createdClient);

      expect(result).toBeInstanceOf(ClientEntity);
      expect(result.id).toBe(createdClient.id);
      expect(result.name).toBe('John Smith');
      expect(result.email).toBe('john.smith@example.com');
      expect(result.phone).toBe('+9876543210');
      expect(result.updatedAt.getTime()).toBeGreaterThan(
        result.createdAt.getTime(),
      );

      const dbRecord = await knexInstance<ClientModel>('clients')
        .where({ id: result.id })
        .first();
      expect(dbRecord!.name).toBe('John Smith');
      expect(dbRecord!.email).toBe('john.smith@example.com');
      expect(dbRecord!.phone).toBe('+9876543210');
    });

    it('should update updatedAt timestamp when updating client', async () => {
      const client = new ClientEntity({
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
      });
      const createdClient = await repository.create(client);
      const originalUpdatedAt = createdClient.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      createdClient.name = 'Updated Name';

      const result = await repository.update(createdClient);

      expect(result.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime(),
      );
    });
  });

  describe('findByEmail', () => {
    it('should return client when found by email', async () => {
      const client = new ClientEntity({
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
      });
      const createdClient = await repository.create(client);

      const result = await repository.findByEmail('john.doe@example.com');

      expect(result).toBeInstanceOf(ClientEntity);
      expect(result?.id).toBe(createdClient.id);
      expect(result?.name).toBe('John Doe');
      expect(result?.email).toBe('john.doe@example.com');
    });

    it('should return null when client not found by email', async () => {
      const result = await repository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should be case sensitive', async () => {
      const client = new ClientEntity({
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
      });
      await repository.create(client);

      const result = await repository.findByEmail('JOHN.DOE@EXAMPLE.COM');

      expect(result).toBeNull();
    });
  });

  describe('findByPhone', () => {
    it('should return client when found by phone', async () => {
      const client = new ClientEntity({
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
      });
      const createdClient = await repository.create(client);

      const result = await repository.findByPhone('+1234567890');

      expect(result).toBeInstanceOf(ClientEntity);
      expect(result?.id).toBe(createdClient.id);
      expect(result?.name).toBe('John Doe');
      expect(result?.phone).toBe('+1234567890');
    });

    it('should return null when client not found by phone', async () => {
      const result = await repository.findByPhone('+9999999999');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return client when found by id', async () => {
      const client = new ClientEntity({
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
      });
      const createdClient = await repository.create(client);

      const result = await repository.findById(createdClient.id);

      expect(result).toBeInstanceOf(ClientEntity);
      expect(result?.id).toBe(createdClient.id);
      expect(result?.name).toBe('John Doe');
    });

    it('should return null when client not found by id', async () => {
      const result = await repository.findById(
        '550e8400-e29b-41d4-a716-446655440999',
      );

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all clients', async () => {
      await createTestClients();

      const result = await repository.findAll();

      expect(result).toHaveLength(4);
      expect(result.every((client) => client instanceof ClientEntity)).toBe(
        true,
      );

      const names = result.map((client) => client.name).sort();
      expect(names).toEqual([
        'Alice Brown',
        'Bob Johnson',
        'Jane Smith',
        'John Doe',
      ]);
    });

    it('should return empty array when no clients exist', async () => {
      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should delete client by id', async () => {
      const client = new ClientEntity({
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
      });
      const createdClient = await repository.create(client);

      let dbRecord = await knexInstance<ClientModel>('clients')
        .where({ id: createdClient.id })
        .first();
      expect(dbRecord).toBeDefined();

      await repository.delete(createdClient.id);

      dbRecord = await knexInstance<ClientModel>('clients')
        .where({ id: createdClient.id })
        .first();
      expect(dbRecord).toBeUndefined();
    });
  });

  describe('findPaginated', () => {
    it('should return paginated clients with default parameters', async () => {
      await createTestClients();

      const result = await repository.findPaginated();

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(4);
      expect(result.data).toHaveLength(4);
      expect(
        result.data.every((client) => client instanceof ClientEntity),
      ).toBe(true);
    });

    it('should return paginated clients with custom limit', async () => {
      await createTestClients();

      const params: FindPaginatedParams = {
        page: 1,
        limit: 2,
      };

      const result = await repository.findPaginated(params);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.total).toBe(4);
      expect(result.data).toHaveLength(2);
    });

    it('should sort clients by name ascending', async () => {
      await createTestClients();

      const params: FindPaginatedParams = {
        sort: {
          sortBy: 'name',
          sortOrder: 'asc',
        },
      };

      const result = await repository.findPaginated(params);

      expect(result.data).toHaveLength(4);
      expect(result.data[0].name).toBe('Alice Brown');
      expect(result.data[1].name).toBe('Bob Johnson');
      expect(result.data[2].name).toBe('Jane Smith');
      expect(result.data[3].name).toBe('John Doe');
    });

    it('should filter clients by name using LIKE operator', async () => {
      await createTestClients();

      const params: FindPaginatedParams = {
        filters: [
          {
            field: 'name',
            operator: FilterOperator.LIKE,
            value: 'John',
          },
        ],
      };

      const result = await repository.findPaginated(params);

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.data.every((client) => client.name.includes('John'))).toBe(
        true,
      );
    });

    it('should filter clients by email using EQ operator', async () => {
      await createTestClients();

      const params: FindPaginatedParams = {
        filters: [
          {
            field: 'email',
            operator: FilterOperator.EQ,
            value: 'jane.smith@example.com',
          },
        ],
      };

      const result = await repository.findPaginated(params);

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].email).toBe('jane.smith@example.com');
    });

    it('should combine pagination, sorting, and filtering', async () => {
      await createTestClients();

      const params: FindPaginatedParams = {
        page: 1,
        limit: 1,
        sort: {
          sortBy: 'name',
          sortOrder: 'asc',
        },
        filters: [
          {
            field: 'name',
            operator: FilterOperator.LIKE,
            value: 'John',
          },
        ],
      };

      const result = await repository.findPaginated(params);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(1);
      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Bob Johnson');
    });
  });

  describe('toModel', () => {
    it('should convert client entity to model correctly', () => {
      const client = new ClientEntity({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      });

      const result = repository.toModel(client);

      expect(result).toEqual({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        created_at: new Date('2024-01-01T00:00:00.000Z'),
        updated_at: new Date('2024-01-02T00:00:00.000Z'),
      });
    });
  });

  describe('toEntity', () => {
    it('should convert client model to entity correctly', () => {
      const model: ClientModel = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        created_at: new Date('2024-01-01T00:00:00.000Z'),
        updated_at: new Date('2024-01-02T00:00:00.000Z'),
      };

      const result = repository.toEntity(model);

      expect(result).toBeInstanceOf(ClientEntity);
      expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john.doe@example.com');
      expect(result.phone).toBe('+1234567890');
      expect(result.createdAt).toEqual(new Date('2024-01-01T00:00:00.000Z'));
      expect(result.updatedAt).toEqual(new Date('2024-01-02T00:00:00.000Z'));
    });
  });

  describe('toCollection', () => {
    it('should convert array of client models to array of entities', () => {
      const models: ClientModel[] = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          phone: '+1234567891',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const result = repository.toCollection(models);

      expect(result).toHaveLength(2);
      expect(result.every((client) => client instanceof ClientEntity)).toBe(
        true,
      );
      expect(result[0].name).toBe('John Doe');
      expect(result[1].name).toBe('Jane Smith');
    });

    it('should handle empty array', () => {
      const result = repository.toCollection([]);

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
