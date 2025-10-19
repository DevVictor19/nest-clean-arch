import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Knex } from 'knex';
import { AddressPostgresRepository } from '../../address-postgres-repository';
import { AddressEntity } from '../../../../domain/entities';
import { AddressModel } from '../../../models';
import {
  FilterOperator,
  FindPaginatedParams,
} from '@/core/domain/repositories';
import {
  cleanupDatabaseContainer,
  cleanupTables,
  initDatabaseContainer,
} from '@/core/infra/tests';

describe('AddressPostgresRepository Integration Tests', () => {
  let container: StartedPostgreSqlContainer;
  let knexInstance: Knex;
  let repository: AddressPostgresRepository;

  beforeAll(async () => {
    const instance = await initDatabaseContainer();
    container = instance.container;
    knexInstance = instance.knexInstance;

    repository = new AddressPostgresRepository(knexInstance);
  }, 30000);

  afterAll(async () => {
    await cleanupDatabaseContainer(container, knexInstance);
  });

  beforeEach(async () => {
    await cleanupTables(knexInstance);
  });

  const createTestClient = async (): Promise<string> => {
    const clientId = '550e8400-e29b-41d4-a716-446655440000';
    await knexInstance('clients').insert({
      id: clientId,
      name: 'Test Client',
      email: 'test@example.com',
      phone: '+1234567890',
      created_at: new Date(),
      updated_at: new Date(),
    });
    return clientId;
  };

  const createTestAddresses = async () => {
    const clientId1 = await createTestClient();
    const clientId2 = '550e8400-e29b-41d4-a716-446655440001';
    await knexInstance('clients').insert({
      id: clientId2,
      name: 'Test Client 2',
      email: 'test2@example.com',
      phone: '+1234567891',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const addressesData = [
      new AddressEntity({
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        complement: 'Apt 1A',
        clientId: clientId1,
      }),
      new AddressEntity({
        street: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90210',
        country: 'USA',
        complement: 'Suite 200',
        clientId: clientId1,
      }),
      new AddressEntity({
        street: '789 Pine St',
        city: 'Chicago',
        state: 'IL',
        zipCode: '60601',
        country: 'USA',
        clientId: clientId2,
      }),
      new AddressEntity({
        street: '321 Elm Dr',
        city: 'Miami',
        state: 'FL',
        zipCode: '33101',
        country: 'USA',
        complement: 'Floor 5',
        clientId: clientId2,
      }),
    ];

    for (const address of addressesData) {
      await repository.create(address);
    }

    return { addresses: addressesData, clientId1, clientId2 };
  };

  describe('create', () => {
    it('should create an address successfully', async () => {
      const clientId = await createTestClient();
      const addressData = {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        complement: 'Apt 1A',
        clientId: clientId,
      };
      const address = new AddressEntity(addressData);

      const result = await repository.create(address);

      expect(result).toBeInstanceOf(AddressEntity);
      expect(result.id).toBeDefined();
      expect(result.street).toBe(addressData.street);
      expect(result.city).toBe(addressData.city);
      expect(result.state).toBe(addressData.state);
      expect(result.zipCode).toBe(addressData.zipCode);
      expect(result.country).toBe(addressData.country);
      expect(result.complement).toBe(addressData.complement);
      expect(result.clientId).toBe(clientId);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);

      const dbRecord = await knexInstance<AddressModel>('addresses')
        .where({ id: result.id })
        .first();
      expect(dbRecord).toBeDefined();
      expect(dbRecord!.street).toBe(addressData.street);
      expect(dbRecord!.city).toBe(addressData.city);
      expect(dbRecord!.zip_code).toBe(addressData.zipCode);
      expect(dbRecord!.client_id).toBe(clientId);
    });

    it('should create an address without complement', async () => {
      const clientId = await createTestClient();
      const addressData = {
        street: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90210',
        country: 'USA',
        clientId: clientId,
      };
      const address = new AddressEntity(addressData);

      const result = await repository.create(address);

      expect(result).toBeInstanceOf(AddressEntity);
      expect(result.complement).toBeUndefined();

      const dbRecord = await knexInstance<AddressModel>('addresses')
        .where({ id: result.id })
        .first();
      expect(dbRecord!.complement).toBeNull();
    });
  });

  describe('update', () => {
    it('should update an address successfully', async () => {
      const clientId = await createTestClient();
      const address = new AddressEntity({
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        clientId: clientId,
      });
      const createdAddress = await repository.create(address);

      createdAddress.street = '456 Updated St';
      createdAddress.city = 'Boston';
      createdAddress.state = 'MA';
      createdAddress.zipCode = '02101';
      createdAddress.complement = 'Updated Apt';

      const result = await repository.update(createdAddress);

      expect(result).toBeInstanceOf(AddressEntity);
      expect(result.id).toBe(createdAddress.id);
      expect(result.street).toBe('456 Updated St');
      expect(result.city).toBe('Boston');
      expect(result.state).toBe('MA');
      expect(result.zipCode).toBe('02101');
      expect(result.complement).toBe('Updated Apt');
      expect(result.updatedAt.getTime()).toBeGreaterThan(
        result.createdAt.getTime(),
      );

      const dbRecord = await knexInstance<AddressModel>('addresses')
        .where({ id: result.id })
        .first();
      expect(dbRecord!.street).toBe('456 Updated St');
      expect(dbRecord!.city).toBe('Boston');
      expect(dbRecord!.zip_code).toBe('02101');
      expect(dbRecord!.complement).toBe('Updated Apt');
    });
  });

  describe('findById', () => {
    it('should return address when found by id', async () => {
      const clientId = await createTestClient();
      const address = new AddressEntity({
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        clientId: clientId,
      });
      const createdAddress = await repository.create(address);

      const result = await repository.findById(createdAddress.id);

      expect(result).toBeInstanceOf(AddressEntity);
      expect(result?.id).toBe(createdAddress.id);
      expect(result?.street).toBe('123 Main St');
      expect(result?.city).toBe('New York');
    });

    it('should return null when address not found by id', async () => {
      const result = await repository.findById(
        '550e8400-e29b-41d4-a716-446655440999',
      );

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all addresses', async () => {
      await createTestAddresses();

      const result = await repository.findAll();

      expect(result).toHaveLength(4);
      expect(result.every((address) => address instanceof AddressEntity)).toBe(
        true,
      );

      const streets = result.map((address) => address.street).sort();
      expect(streets).toEqual([
        '123 Main St',
        '321 Elm Dr',
        '456 Oak Ave',
        '789 Pine St',
      ]);
    });

    it('should return empty array when no addresses exist', async () => {
      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should delete address by id', async () => {
      const clientId = await createTestClient();
      const address = new AddressEntity({
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        clientId: clientId,
      });
      const createdAddress = await repository.create(address);

      let dbRecord = await knexInstance<AddressModel>('addresses')
        .where({ id: createdAddress.id })
        .first();
      expect(dbRecord).toBeDefined();

      await repository.delete(createdAddress.id);

      dbRecord = await knexInstance<AddressModel>('addresses')
        .where({ id: createdAddress.id })
        .first();
      expect(dbRecord).toBeUndefined();
    });
  });

  describe('findByZipCodes', () => {
    it('should return addresses matching provided zip codes', async () => {
      await createTestAddresses();

      const result = await repository.findByZipCodes(['10001', '90210']);

      expect(result).toHaveLength(2);
      expect(result.every((address) => address instanceof AddressEntity)).toBe(
        true,
      );

      const zipCodes = result.map((address) => address.zipCode).sort();
      expect(zipCodes).toEqual(['10001', '90210']);

      const cities = result.map((address) => address.city).sort();
      expect(cities).toEqual(['Los Angeles', 'New York']);
    });

    it('should return empty array when no addresses match zip codes', async () => {
      await createTestAddresses();

      const result = await repository.findByZipCodes(['99999', '88888']);

      expect(result).toEqual([]);
    });

    it('should handle empty zip codes array', async () => {
      await createTestAddresses();

      const result = await repository.findByZipCodes([]);

      expect(result).toEqual([]);
    });

    it('should return partial matches when some zip codes exist', async () => {
      await createTestAddresses();

      const result = await repository.findByZipCodes(['10001', '99999']);

      expect(result).toHaveLength(1);
      expect(result[0].zipCode).toBe('10001');
      expect(result[0].city).toBe('New York');
    });
  });

  describe('findByClientId', () => {
    it('should return all addresses for a specific client', async () => {
      const { clientId1 } = await createTestAddresses();

      const result = await repository.findByClientId(clientId1);

      expect(result).toHaveLength(2);
      expect(result.every((address) => address instanceof AddressEntity)).toBe(
        true,
      );
      expect(result.every((address) => address.clientId === clientId1)).toBe(
        true,
      );

      const cities = result.map((address) => address.city).sort();
      expect(cities).toEqual(['Los Angeles', 'New York']);
    });

    it('should return empty array when client has no addresses', async () => {
      const clientId = await createTestClient();

      const result = await repository.findByClientId(clientId);

      expect(result).toEqual([]);
    });

    it('should return empty array when client does not exist', async () => {
      const result = await repository.findByClientId(
        '550e8400-e29b-41d4-a716-446655440999',
      );

      expect(result).toEqual([]);
    });
  });

  describe('deleteByClientId', () => {
    it('should delete all addresses for a specific client', async () => {
      const { clientId1, clientId2 } = await createTestAddresses();

      let addressesClient1 = await repository.findByClientId(clientId1);
      let addressesClient2 = await repository.findByClientId(clientId2);
      expect(addressesClient1).toHaveLength(2);
      expect(addressesClient2).toHaveLength(2);

      await repository.deleteByClientId(clientId1);

      addressesClient1 = await repository.findByClientId(clientId1);
      addressesClient2 = await repository.findByClientId(clientId2);
      expect(addressesClient1).toHaveLength(0);
      expect(addressesClient2).toHaveLength(2);

      const dbAddresses =
        await knexInstance<AddressModel>('addresses').select('*');
      expect(dbAddresses).toHaveLength(2);
      expect(dbAddresses.every((addr) => addr.client_id === clientId2)).toBe(
        true,
      );
    });

    it('should not throw error when deleting addresses for non-existent client', async () => {
      await createTestAddresses();

      await expect(
        repository.deleteByClientId('550e8400-e29b-41d4-a716-446655440999'),
      ).resolves.not.toThrow();

      const allAddresses = await repository.findAll();
      expect(allAddresses).toHaveLength(4);
    });
  });

  describe('findPaginated', () => {
    it('should return paginated addresses with default parameters', async () => {
      await createTestAddresses();

      const result = await repository.findPaginated();

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(4);
      expect(result.data).toHaveLength(4);
      expect(
        result.data.every((address) => address instanceof AddressEntity),
      ).toBe(true);
    });

    it('should return paginated addresses with custom limit', async () => {
      await createTestAddresses();

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

    it('should sort addresses by city ascending', async () => {
      await createTestAddresses();

      const params: FindPaginatedParams = {
        sort: {
          sortBy: 'city',
          sortOrder: 'asc',
        },
      };

      const result = await repository.findPaginated(params);

      expect(result.data).toHaveLength(4);
      expect(result.data[0].city).toBe('Chicago');
      expect(result.data[1].city).toBe('Los Angeles');
      expect(result.data[2].city).toBe('Miami');
      expect(result.data[3].city).toBe('New York');
    });

    it('should filter addresses by state using EQ operator', async () => {
      await createTestAddresses();

      const params: FindPaginatedParams = {
        filters: [
          {
            field: 'state',
            operator: FilterOperator.EQ,
            value: 'NY',
          },
        ],
      };

      const result = await repository.findPaginated(params);

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].state).toBe('NY');
      expect(result.data[0].city).toBe('New York');
    });

    it('should filter addresses by city using LIKE operator', async () => {
      await createTestAddresses();

      const params: FindPaginatedParams = {
        filters: [
          {
            field: 'city',
            operator: FilterOperator.LIKE,
            value: 'Los',
          },
        ],
      };

      const result = await repository.findPaginated(params);

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].city).toBe('Los Angeles');
    });

    it('should combine pagination, sorting, and filtering', async () => {
      await createTestAddresses();

      const params: FindPaginatedParams = {
        page: 1,
        limit: 1,
        sort: {
          sortBy: 'city',
          sortOrder: 'asc',
        },
        filters: [
          {
            field: 'country',
            operator: FilterOperator.EQ,
            value: 'USA',
          },
        ],
      };

      const result = await repository.findPaginated(params);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(1);
      expect(result.total).toBe(4);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].city).toBe('Chicago');
    });
  });

  describe('toModel', () => {
    it('should convert address entity to model correctly', () => {
      const entity = new AddressEntity({
        id: '550e8400-e29b-41d4-a716-446655440000',
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        complement: 'Apt 1A',
        clientId: '550e8400-e29b-41d4-a716-446655440001',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
      });

      const result = repository.toModel(entity);

      expect(result).toEqual({
        id: '550e8400-e29b-41d4-a716-446655440000',
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip_code: '10001',
        country: 'USA',
        complement: 'Apt 1A',
        client_id: '550e8400-e29b-41d4-a716-446655440001',
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2023-01-02'),
      });
    });
  });

  describe('toEntity', () => {
    it('should convert address model to entity correctly', () => {
      const model: AddressModel = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip_code: '10001',
        country: 'USA',
        complement: 'Apt 1A',
        client_id: '550e8400-e29b-41d4-a716-446655440001',
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2023-01-02'),
      };

      const result = repository.toEntity(model);

      expect(result).toBeInstanceOf(AddressEntity);
      expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.street).toBe('123 Main St');
      expect(result.city).toBe('New York');
      expect(result.state).toBe('NY');
      expect(result.zipCode).toBe('10001');
      expect(result.country).toBe('USA');
      expect(result.complement).toBe('Apt 1A');
      expect(result.clientId).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(result.createdAt).toEqual(new Date('2023-01-01'));
      expect(result.updatedAt).toEqual(new Date('2023-01-02'));
    });
  });

  describe('toCollection', () => {
    it('should convert array of address models to array of entities', () => {
      const models: AddressModel[] = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip_code: '10001',
          country: 'USA',
          complement: 'Apt 1A',
          client_id: '550e8400-e29b-41d4-a716-446655440001',
          created_at: new Date('2023-01-01'),
          updated_at: new Date('2023-01-02'),
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          street: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          zip_code: '90210',
          country: 'USA',
          complement: undefined,
          client_id: '550e8400-e29b-41d4-a716-446655440001',
          created_at: new Date('2023-01-03'),
          updated_at: new Date('2023-01-04'),
        },
      ];

      const result = repository.toCollection(models);

      expect(result).toHaveLength(2);
      expect(result.every((entity) => entity instanceof AddressEntity)).toBe(
        true,
      );
      expect(result[0].street).toBe('123 Main St');
      expect(result[0].zipCode).toBe('10001');
      expect(result[1].street).toBe('456 Oak Ave');
      expect(result[1].zipCode).toBe('90210');
      expect(result[1].complement).toBeUndefined();
    });

    it('should handle empty array', () => {
      const result = repository.toCollection([]);

      expect(result).toEqual([]);
    });
  });
});
