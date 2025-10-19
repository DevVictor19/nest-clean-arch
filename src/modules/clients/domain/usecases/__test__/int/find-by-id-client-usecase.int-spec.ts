import { AddressService } from '@/modules/addresses/domain/services';
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
import { FindByIdClientUseCase } from '../../find-by-id-client-usecase';
import { ClientPostgresRepository } from '@/modules/clients/infra/repositories';
import { AddressServiceImpl } from '@/modules/addresses/infra/services';
import { AddressRepository } from '@/modules/addresses/domain/repositories';
import { AddressPostgresRepository } from '@/modules/addresses/infra/repositories';
import { NotFoundError } from '@/core/domain/errors/base-errors';
import { ClientEntity } from '../../../entities';
import { ClientModel } from '@/modules/clients/infra/models';
import { AddressModel } from '@/modules/addresses/infra/models';

describe('FindByIdClientUseCase Integration Tests', () => {
  let findByIdClientUseCase: FindByIdClientUseCase;
  let clientRepository: ClientRepository;
  let addressService: AddressService;
  let knexInstance: Knex;
  let container: StartedPostgreSqlContainer;

  beforeAll(async () => {
    const instance = await initDatabaseContainer();
    container = instance.container;
    knexInstance = instance.knexInstance;

    const moduleRef = await Test.createTestingModule({
      providers: [
        FindByIdClientUseCase,
        {
          provide: ClientRepository,
          useClass: ClientPostgresRepository,
        },
        {
          provide: AddressService,
          useClass: AddressServiceImpl,
        },
        {
          provide: AddressRepository,
          useClass: AddressPostgresRepository,
        },
        {
          provide: Connection,
          useValue: knexInstance,
        },
      ],
    }).compile();

    findByIdClientUseCase = moduleRef.get<FindByIdClientUseCase>(
      FindByIdClientUseCase,
    );
    clientRepository = moduleRef.get<ClientRepository>(ClientRepository);
    addressService = moduleRef.get<AddressService>(AddressService);
  }, 30000);

  afterAll(async () => {
    await cleanupDatabaseContainer(container, knexInstance);
  });

  beforeEach(async () => {
    await cleanupTables(knexInstance);
  });

  describe('execute - Success Cases', () => {
    it('should find a client without addresses', async () => {
      const client = new ClientEntity({
        name: 'João Silva',
        email: 'joao@example.com',
        phone: '11999999999',
      });

      await clientRepository.create(client);

      const result = await findByIdClientUseCase.execute({
        clientId: client.id,
      });

      expect(result).toBeInstanceOf(ClientEntity);
      expect(result.id).toBe(client.id);
      expect(result.name).toBe('João Silva');
      expect(result.email).toBe('joao@example.com');
      expect(result.phone).toBe('11999999999');
      expect(result.addresses).toEqual([]);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should find a client with a single address', async () => {
      const client = new ClientEntity({
        name: 'Maria Souza',
        email: 'maria@example.com',
        phone: '11888888888',
      });

      await clientRepository.create(client);

      await addressService.createMany([
        {
          street: 'Rua A',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234-567',
          country: 'Brasil',
          clientId: client.id,
        },
      ]);

      const result = await findByIdClientUseCase.execute({
        clientId: client.id,
      });

      expect(result).toBeInstanceOf(ClientEntity);
      expect(result.id).toBe(client.id);
      expect(result.name).toBe('Maria Souza');
      expect(result.addresses).toHaveLength(1);
      expect(result.addresses![0].street).toBe('Rua A');
      expect(result.addresses![0].city).toBe('São Paulo');
      expect(result.addresses![0].state).toBe('SP');
      expect(result.addresses![0].zipCode).toBe('01234-567');
      expect(result.addresses![0].country).toBe('Brasil');
      expect(result.addresses![0].clientId).toBe(client.id);
    });

    it('should find a client with multiple addresses', async () => {
      const client = new ClientEntity({
        name: 'Carlos Lima',
        email: 'carlos@example.com',
        phone: '11777777777',
      });

      await clientRepository.create(client);

      await addressService.createMany([
        {
          street: 'Rua A',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234-567',
          country: 'Brasil',
          clientId: client.id,
        },
        {
          street: 'Rua B',
          city: 'Rio de Janeiro',
          state: 'RJ',
          zipCode: '98765-432',
          country: 'Brasil',
          clientId: client.id,
        },
        {
          street: 'Rua C',
          city: 'Belo Horizonte',
          state: 'MG',
          zipCode: '11111-222',
          country: 'Brasil',
          clientId: client.id,
        },
      ]);

      const result = await findByIdClientUseCase.execute({
        clientId: client.id,
      });

      expect(result).toBeInstanceOf(ClientEntity);
      expect(result.id).toBe(client.id);
      expect(result.addresses).toHaveLength(3);

      const zipCodes = result.addresses!.map((addr) => addr.zipCode);
      expect(zipCodes).toContain('01234-567');
      expect(zipCodes).toContain('98765-432');
      expect(zipCodes).toContain('11111-222');
    });

    it('should find a client with address containing complement', async () => {
      const client = new ClientEntity({
        name: 'Ana Costa',
        email: 'ana@example.com',
        phone: '11666666666',
      });

      await clientRepository.create(client);

      await addressService.createMany([
        {
          street: 'Rua Principal',
          city: 'Campinas',
          state: 'SP',
          zipCode: '13000-000',
          country: 'Brasil',
          complement: 'Apto 101',
          clientId: client.id,
        },
      ]);

      const result = await findByIdClientUseCase.execute({
        clientId: client.id,
      });

      expect(result).toBeInstanceOf(ClientEntity);
      expect(result.addresses).toHaveLength(1);
      expect(result.addresses![0].complement).toBe('Apto 101');
    });

    it('should return correct client when multiple clients exist', async () => {
      const client1 = new ClientEntity({
        name: 'Client 1',
        email: 'client1@example.com',
        phone: '11111111111',
      });

      const client2 = new ClientEntity({
        name: 'Client 2',
        email: 'client2@example.com',
        phone: '22222222222',
      });

      const client3 = new ClientEntity({
        name: 'Client 3',
        email: 'client3@example.com',
        phone: '33333333333',
      });

      await clientRepository.create(client1);
      await clientRepository.create(client2);
      await clientRepository.create(client3);

      await addressService.createMany([
        {
          street: 'Street 1',
          city: 'City 1',
          state: 'ST',
          zipCode: '11111-111',
          country: 'Country 1',
          clientId: client1.id,
        },
      ]);

      await addressService.createMany([
        {
          street: 'Street 2',
          city: 'City 2',
          state: 'ST',
          zipCode: '22222-222',
          country: 'Country 2',
          clientId: client2.id,
        },
      ]);

      await addressService.createMany([
        {
          street: 'Street 3',
          city: 'City 3',
          state: 'ST',
          zipCode: '33333-333',
          country: 'Country 3',
          clientId: client3.id,
        },
      ]);

      const result = await findByIdClientUseCase.execute({
        clientId: client2.id,
      });

      expect(result.id).toBe(client2.id);
      expect(result.name).toBe('Client 2');
      expect(result.email).toBe('client2@example.com');
      expect(result.phone).toBe('22222222222');
      expect(result.addresses).toHaveLength(1);
      expect(result.addresses![0].zipCode).toBe('22222-222');
    });

    it('should return client with addresses in correct order', async () => {
      const client = new ClientEntity({
        name: 'Order Test Client',
        email: 'order@example.com',
        phone: '11555555555',
      });

      await clientRepository.create(client);

      await addressService.createMany([
        {
          street: 'First Street',
          city: 'City A',
          state: 'ST',
          zipCode: '11111-111',
          country: 'Country A',
          clientId: client.id,
        },
      ]);

      await addressService.createMany([
        {
          street: 'Second Street',
          city: 'City B',
          state: 'ST',
          zipCode: '22222-222',
          country: 'Country B',
          clientId: client.id,
        },
      ]);

      const result = await findByIdClientUseCase.execute({
        clientId: client.id,
      });

      expect(result.addresses).toHaveLength(2);
      expect(result.addresses![0].createdAt).toBeInstanceOf(Date);
      expect(result.addresses![1].createdAt).toBeInstanceOf(Date);
    });
  });

  describe('execute - Error Cases', () => {
    it('should throw NotFoundError when client does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await expect(
        findByIdClientUseCase.execute({ clientId: nonExistentId }),
      ).rejects.toThrow(NotFoundError);

      await expect(
        findByIdClientUseCase.execute({ clientId: nonExistentId }),
      ).rejects.toThrow('Client not found');
    });

    it('should throw NotFoundError with correct error code', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      try {
        await findByIdClientUseCase.execute({ clientId: nonExistentId });
        fail('Should have thrown NotFoundError');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as NotFoundError).errorCode).toBe('NOT_FOUND');
      }
    });

    it('should throw NotFoundError when client was deleted', async () => {
      const client = new ClientEntity({
        name: 'Deleted Client',
        email: 'deleted@example.com',
        phone: '11444444444',
      });

      await clientRepository.create(client);

      await clientRepository.delete(client.id);

      await expect(
        findByIdClientUseCase.execute({ clientId: client.id }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should not return addresses from other clients', async () => {
      const client1 = new ClientEntity({
        name: 'Client 1',
        email: 'client1@example.com',
        phone: '11111111111',
      });

      const client2 = new ClientEntity({
        name: 'Client 2',
        email: 'client2@example.com',
        phone: '22222222222',
      });

      await clientRepository.create(client1);
      await clientRepository.create(client2);

      await addressService.createMany([
        {
          street: 'Client 1 Street',
          city: 'City 1',
          state: 'ST',
          zipCode: '11111-111',
          country: 'Country 1',
          clientId: client1.id,
        },
      ]);

      await addressService.createMany([
        {
          street: 'Client 2 Street',
          city: 'City 2',
          state: 'ST',
          zipCode: '22222-222',
          country: 'Country 2',
          clientId: client2.id,
        },
      ]);

      const result = await findByIdClientUseCase.execute({
        clientId: client1.id,
      });

      expect(result.addresses).toHaveLength(1);
      expect(result.addresses![0].street).toBe('Client 1 Street');
      expect(result.addresses![0].zipCode).toBe('11111-111');
      expect(result.addresses![0].clientId).toBe(client1.id);
    });
  });

  describe('execute - Edge Cases', () => {
    it('should handle finding same client multiple times', async () => {
      const client = new ClientEntity({
        name: 'Multiple Find Client',
        email: 'multiplefind@example.com',
        phone: '11333333333',
      });

      await clientRepository.create(client);

      await addressService.createMany([
        {
          street: 'Test Street',
          city: 'Test City',
          state: 'TS',
          zipCode: '99999-999',
          country: 'Test Country',
          clientId: client.id,
        },
      ]);

      const result1 = await findByIdClientUseCase.execute({
        clientId: client.id,
      });
      const result2 = await findByIdClientUseCase.execute({
        clientId: client.id,
      });
      const result3 = await findByIdClientUseCase.execute({
        clientId: client.id,
      });

      expect(result1.id).toBe(client.id);
      expect(result2.id).toBe(client.id);
      expect(result3.id).toBe(client.id);
      expect(result1.name).toBe(result2.name);
      expect(result2.name).toBe(result3.name);
      expect(result1.addresses).toHaveLength(1);
      expect(result2.addresses).toHaveLength(1);
      expect(result3.addresses).toHaveLength(1);
    });

    it('should return fresh data from database', async () => {
      const client = new ClientEntity({
        name: 'Fresh Data Client',
        email: 'fresh@example.com',
        phone: '11222222222',
      });

      await clientRepository.create(client);

      const result1 = await findByIdClientUseCase.execute({
        clientId: client.id,
      });
      expect(result1.addresses).toHaveLength(0);

      await addressService.createMany([
        {
          street: 'New Street',
          city: 'New City',
          state: 'NS',
          zipCode: '88888-888',
          country: 'New Country',
          clientId: client.id,
        },
      ]);

      const result2 = await findByIdClientUseCase.execute({
        clientId: client.id,
      });
      expect(result2.addresses).toHaveLength(1);
      expect(result2.addresses![0].street).toBe('New Street');
    });

    it('should handle client with address without complement', async () => {
      const client = new ClientEntity({
        name: 'No Complement Client',
        email: 'nocomplement@example.com',
        phone: '11000000000',
      });

      await clientRepository.create(client);

      await addressService.createMany([
        {
          street: 'Simple Street',
          city: 'Simple City',
          state: 'SC',
          zipCode: '77777-777',
          country: 'Simple Country',
          clientId: client.id,
        },
      ]);

      const result = await findByIdClientUseCase.execute({
        clientId: client.id,
      });

      expect(result.addresses).toHaveLength(1);
      expect(result.addresses![0].complement).toBeUndefined();
    });

    it('should verify data consistency with database', async () => {
      const client = new ClientEntity({
        name: 'Consistency Client',
        email: 'consistency@example.com',
        phone: '11999999998',
      });

      await clientRepository.create(client);

      await addressService.createMany([
        {
          street: 'Consistency Street',
          city: 'Consistency City',
          state: 'CS',
          zipCode: '66666-666',
          country: 'Consistency Country',
          clientId: client.id,
        },
      ]);

      const result = await findByIdClientUseCase.execute({
        clientId: client.id,
      });

      const clientInDb = await knexInstance<ClientModel>('clients')
        .where({ id: client.id })
        .first();
      const addressesInDb = await knexInstance<AddressModel>('addresses')
        .where({ client_id: client.id })
        .select();

      expect(result.name).toBe(clientInDb!.name);
      expect(result.email).toBe(clientInDb!.email);
      expect(result.phone).toBe(clientInDb!.phone);
      expect(result.addresses).toHaveLength(addressesInDb.length);
      expect(result.addresses![0].street).toBe(addressesInDb[0].street);
    });

    it('should handle concurrent finds correctly', async () => {
      const client = new ClientEntity({
        name: 'Concurrent Client',
        email: 'concurrent@example.com',
        phone: '11888888887',
      });

      await clientRepository.create(client);

      await addressService.createMany([
        {
          street: 'Concurrent Street',
          city: 'Concurrent City',
          state: 'CC',
          zipCode: '55555-555',
          country: 'Concurrent Country',
          clientId: client.id,
        },
      ]);

      const results = await Promise.all([
        findByIdClientUseCase.execute({ clientId: client.id }),
        findByIdClientUseCase.execute({ clientId: client.id }),
        findByIdClientUseCase.execute({ clientId: client.id }),
      ]);

      expect(results).toHaveLength(3);
      expect(results[0].id).toBe(client.id);
      expect(results[1].id).toBe(client.id);
      expect(results[2].id).toBe(client.id);
      expect(results[0].addresses).toHaveLength(1);
      expect(results[1].addresses).toHaveLength(1);
      expect(results[2].addresses).toHaveLength(1);
    });
  });
});
