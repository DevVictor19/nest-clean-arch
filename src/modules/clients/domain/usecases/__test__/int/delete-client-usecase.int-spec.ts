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
import { DeleteClientUseCase } from '../../delete-client-usecase';
import { ClientPostgresRepository } from '@/modules/clients/infra/repositories';
import { AddressServiceImpl } from '@/modules/addresses/infra/services';
import { AddressRepository } from '@/modules/addresses/domain/repositories';
import { AddressPostgresRepository } from '@/modules/addresses/infra/repositories';
import { ClientEntity } from '../../../entities';
import { ClientModel } from '@/modules/clients/infra/models';
import { AddressModel } from '@/modules/addresses/infra/models';

describe('DeleteClientUseCase Integration Tests', () => {
  let deleteClientUseCase: DeleteClientUseCase;
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
        DeleteClientUseCase,
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

    deleteClientUseCase =
      moduleRef.get<DeleteClientUseCase>(DeleteClientUseCase);
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
    it('should delete a client without addresses', async () => {
      const client = new ClientEntity({
        name: 'João Silva',
        email: 'joao@example.com',
        phone: '11999999999',
      });

      await clientRepository.create(client);

      const clientBeforeDelete = await knexInstance<ClientModel>('clients')
        .where({ id: client.id })
        .first();
      expect(clientBeforeDelete).toBeDefined();

      await deleteClientUseCase.execute({ clientId: client.id });

      const clientAfterDelete = await knexInstance<ClientModel>('clients')
        .where({ id: client.id })
        .first();
      expect(clientAfterDelete).toBeUndefined();
    });

    it('should delete a client with a single address', async () => {
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

      const clientBeforeDelete = await knexInstance<ClientModel>('clients')
        .where({ id: client.id })
        .first();
      const addressesBeforeDelete = await knexInstance<AddressModel>(
        'addresses',
      )
        .where({ client_id: client.id })
        .select();

      expect(clientBeforeDelete).toBeDefined();
      expect(addressesBeforeDelete).toHaveLength(1);

      await deleteClientUseCase.execute({ clientId: client.id });

      const clientAfterDelete = await knexInstance<ClientModel>('clients')
        .where({ id: client.id })
        .first();
      expect(clientAfterDelete).toBeUndefined();

      const addressesAfterDelete = await knexInstance<AddressModel>('addresses')
        .where({ client_id: client.id })
        .select();
      expect(addressesAfterDelete).toHaveLength(0);
    });

    it('should delete a client with multiple addresses', async () => {
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

      const addressesBeforeDelete = await knexInstance<AddressModel>(
        'addresses',
      )
        .where({ client_id: client.id })
        .select();
      expect(addressesBeforeDelete).toHaveLength(3);

      await deleteClientUseCase.execute({ clientId: client.id });

      const clientAfterDelete = await knexInstance<ClientModel>('clients')
        .where({ id: client.id })
        .first();
      expect(clientAfterDelete).toBeUndefined();

      const addressesAfterDelete = await knexInstance<AddressModel>('addresses')
        .where({ client_id: client.id })
        .select();
      expect(addressesAfterDelete).toHaveLength(0);
    });

    it('should delete only the specified client and not affect others', async () => {
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

      await deleteClientUseCase.execute({ clientId: client1.id });

      const client1AfterDelete = await knexInstance<ClientModel>('clients')
        .where({ id: client1.id })
        .first();
      expect(client1AfterDelete).toBeUndefined();

      const client2AfterDelete = await knexInstance<ClientModel>('clients')
        .where({ id: client2.id })
        .first();
      expect(client2AfterDelete).toBeDefined();
      expect(client2AfterDelete!.name).toBe('Client 2');

      const client1AddressesAfterDelete = await knexInstance<AddressModel>(
        'addresses',
      )
        .where({ client_id: client1.id })
        .select();
      expect(client1AddressesAfterDelete).toHaveLength(0);

      const client2AddressesAfterDelete = await knexInstance<AddressModel>(
        'addresses',
      )
        .where({ client_id: client2.id })
        .select();
      expect(client2AddressesAfterDelete).toHaveLength(1);
    });

    it('should delete a client with addresses containing complements', async () => {
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

      await deleteClientUseCase.execute({ clientId: client.id });

      const clientAfterDelete = await knexInstance<ClientModel>('clients')
        .where({ id: client.id })
        .first();
      const addressesAfterDelete = await knexInstance<AddressModel>('addresses')
        .where({ client_id: client.id })
        .select();

      expect(clientAfterDelete).toBeUndefined();
      expect(addressesAfterDelete).toHaveLength(0);
    });
  });

  describe('execute - Error Cases', () => {
    it('should not throw error when deleting non-existent client', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await expect(
        deleteClientUseCase.execute({ clientId: nonExistentId }),
      ).resolves.toBeUndefined();
    });

    it('should handle deleting the same client twice', async () => {
      const client = new ClientEntity({
        name: 'Test Client',
        email: 'test@example.com',
        phone: '11555555555',
      });

      await clientRepository.create(client);

      await deleteClientUseCase.execute({ clientId: client.id });

      const clientAfterFirstDelete = await knexInstance<ClientModel>('clients')
        .where({ id: client.id })
        .first();
      expect(clientAfterFirstDelete).toBeUndefined();

      await expect(
        deleteClientUseCase.execute({ clientId: client.id }),
      ).resolves.toBeUndefined();
    });
  });

  describe('execute - Edge Cases', () => {
    it('should delete multiple clients sequentially', async () => {
      const clients = [
        new ClientEntity({
          name: 'Client A',
          email: 'clienta@example.com',
          phone: '11111111111',
        }),
        new ClientEntity({
          name: 'Client B',
          email: 'clientb@example.com',
          phone: '22222222222',
        }),
        new ClientEntity({
          name: 'Client C',
          email: 'clientc@example.com',
          phone: '33333333333',
        }),
      ];

      for (const client of clients) {
        await clientRepository.create(client);
      }

      const clientsBeforeDelete =
        await knexInstance<ClientModel>('clients').select();
      expect(clientsBeforeDelete).toHaveLength(3);

      for (const client of clients) {
        await deleteClientUseCase.execute({ clientId: client.id });
      }

      const clientsAfterDelete =
        await knexInstance<ClientModel>('clients').select();
      expect(clientsAfterDelete).toHaveLength(0);
    });

    it('should maintain database consistency after deletion', async () => {
      const client = new ClientEntity({
        name: 'Consistency Test',
        email: 'consistency@example.com',
        phone: '11444444444',
      });

      await clientRepository.create(client);

      await addressService.createMany([
        {
          street: 'Rua 1',
          city: 'City 1',
          state: 'ST',
          zipCode: '11111-111',
          country: 'Country 1',
          clientId: client.id,
        },
        {
          street: 'Rua 2',
          city: 'City 2',
          state: 'ST',
          zipCode: '22222-222',
          country: 'Country 2',
          clientId: client.id,
        },
      ]);

      await deleteClientUseCase.execute({ clientId: client.id });

      const orphanedAddresses = await knexInstance<AddressModel>('addresses')
        .where({ client_id: client.id })
        .select();
      expect(orphanedAddresses).toHaveLength(0);

      const newClient = new ClientEntity({
        name: 'New Client',
        email: 'new@example.com',
        phone: '11999999999',
      });

      await clientRepository.create(newClient);

      const clientInDb = await knexInstance<ClientModel>('clients')
        .where({ id: newClient.id })
        .first();
      expect(clientInDb).toBeDefined();
    });

    it('should handle deletion of client created and deleted in same session', async () => {
      const client = new ClientEntity({
        name: 'Quick Delete',
        email: 'quick@example.com',
        phone: '11333333333',
      });

      await clientRepository.create(client);
      await deleteClientUseCase.execute({ clientId: client.id });

      const clientInDb = await knexInstance<ClientModel>('clients')
        .where({ id: client.id })
        .first();
      expect(clientInDb).toBeUndefined();
    });

    it('should properly cascade delete with foreign key constraints', async () => {
      const client = new ClientEntity({
        name: 'Cascade Test',
        email: 'cascade@example.com',
        phone: '11222222222',
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

      const clientsCountResult = await knexInstance<ClientModel>('clients')
        .count('* as count')
        .first();
      const addressesCountResult = await knexInstance<AddressModel>('addresses')
        .count('* as count')
        .first();

      const clientsCount = Number(
        (clientsCountResult as { count?: string })?.count || 0,
      );
      const addressesCount = Number(
        (addressesCountResult as { count?: string })?.count || 0,
      );

      expect(clientsCount).toBe(1);
      expect(addressesCount).toBe(1);

      await deleteClientUseCase.execute({ clientId: client.id });

      const clientsCountAfterResult = await knexInstance<ClientModel>('clients')
        .count('* as count')
        .first();
      const addressesCountAfterResult = await knexInstance<AddressModel>(
        'addresses',
      )
        .count('* as count')
        .first();

      const clientsCountAfter = Number(
        (clientsCountAfterResult as { count?: string })?.count || 0,
      );
      const addressesCountAfter = Number(
        (addressesCountAfterResult as { count?: string })?.count || 0,
      );

      expect(clientsCountAfter).toBe(0);
      expect(addressesCountAfter).toBe(0);
    });
  });
});
