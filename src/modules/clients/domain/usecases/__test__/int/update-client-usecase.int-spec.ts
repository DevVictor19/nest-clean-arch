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
import { UpdateClientUseCase } from '../../update-client-usecase';
import { ClientPostgresRepository } from '@/modules/clients/infra/repositories';
import { AddressServiceImpl } from '@/modules/addresses/infra/services';
import { AddressRepository } from '@/modules/addresses/domain/repositories';
import { AddressPostgresRepository } from '@/modules/addresses/infra/repositories';
import {
  BadRequestError,
  NotFoundError,
} from '@/core/domain/errors/base-errors';
import { ClientEntity } from '../../../entities';
import { ClientModel } from '@/modules/clients/infra/models';
import { AddressModel } from '@/modules/addresses/infra/models';

describe('UpdateClientUseCase Integration Tests', () => {
  let updateClientUseCase: UpdateClientUseCase;
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
        UpdateClientUseCase,
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

    updateClientUseCase =
      moduleRef.get<UpdateClientUseCase>(UpdateClientUseCase);
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
    it('should update client name', async () => {
      const client = new ClientEntity({
        name: 'João Silva',
        email: 'joao@example.com',
        phone: '11999999999',
      });

      await clientRepository.create(client);

      const result = await updateClientUseCase.execute({
        clientId: client.id,
        name: 'João Silva Santos',
      });

      expect(result).toBeInstanceOf(ClientEntity);
      expect(result.id).toBe(client.id);
      expect(result.name).toBe('João Silva Santos');
      expect(result.email).toBe('joao@example.com');
      expect(result.phone).toBe('11999999999');

      const clientInDb = await knexInstance<ClientModel>('clients')
        .where({ id: client.id })
        .first();

      expect(clientInDb!.name).toBe('João Silva Santos');
    });

    it('should update client email', async () => {
      const client = new ClientEntity({
        name: 'Maria Santos',
        email: 'maria@example.com',
        phone: '11888888888',
      });

      await clientRepository.create(client);

      const result = await updateClientUseCase.execute({
        clientId: client.id,
        email: 'maria.santos@example.com',
      });

      expect(result.id).toBe(client.id);
      expect(result.name).toBe('Maria Santos');
      expect(result.email).toBe('maria.santos@example.com');
      expect(result.phone).toBe('11888888888');

      const clientInDb = await knexInstance<ClientModel>('clients')
        .where({ id: client.id })
        .first();

      expect(clientInDb!.email).toBe('maria.santos@example.com');
    });

    it('should update client phone', async () => {
      const client = new ClientEntity({
        name: 'Carlos Lima',
        email: 'carlos@example.com',
        phone: '11777777777',
      });

      await clientRepository.create(client);

      const result = await updateClientUseCase.execute({
        clientId: client.id,
        phone: '11666666666',
      });

      expect(result.id).toBe(client.id);
      expect(result.name).toBe('Carlos Lima');
      expect(result.email).toBe('carlos@example.com');
      expect(result.phone).toBe('11666666666');

      const clientInDb = await knexInstance<ClientModel>('clients')
        .where({ id: client.id })
        .first();

      expect(clientInDb!.phone).toBe('11666666666');
    });

    it('should update multiple fields at once', async () => {
      const client = new ClientEntity({
        name: 'Ana Costa',
        email: 'ana@example.com',
        phone: '11555555555',
      });

      await clientRepository.create(client);

      const result = await updateClientUseCase.execute({
        clientId: client.id,
        name: 'Ana Costa Silva',
        email: 'ana.silva@example.com',
        phone: '11444444444',
      });

      expect(result.id).toBe(client.id);
      expect(result.name).toBe('Ana Costa Silva');
      expect(result.email).toBe('ana.silva@example.com');
      expect(result.phone).toBe('11444444444');

      const clientInDb = await knexInstance<ClientModel>('clients')
        .where({ id: client.id })
        .first();

      expect(clientInDb!.name).toBe('Ana Costa Silva');
      expect(clientInDb!.email).toBe('ana.silva@example.com');
      expect(clientInDb!.phone).toBe('11444444444');
    });

    it('should update client addresses', async () => {
      const client = new ClientEntity({
        name: 'Pedro Oliveira',
        email: 'pedro@example.com',
        phone: '11333333333',
      });

      await clientRepository.create(client);

      await addressService.createMany([
        {
          street: 'Old Street',
          city: 'Old City',
          state: 'OC',
          zipCode: '11111-111',
          country: 'Old Country',
          clientId: client.id,
        },
      ]);

      const result = await updateClientUseCase.execute({
        clientId: client.id,
        addresses: [
          {
            street: 'New Street',
            city: 'New City',
            state: 'NC',
            zipCode: '22222-222',
            country: 'New Country',
          },
        ],
      });

      expect(result.id).toBe(client.id);

      const addressesInDb = await knexInstance<AddressModel>('addresses')
        .where({ client_id: client.id })
        .select();

      expect(addressesInDb).toHaveLength(1);
      expect(addressesInDb[0].street).toBe('New Street');
      expect(addressesInDb[0].city).toBe('New City');
      expect(addressesInDb[0].zip_code).toBe('22222-222');

      const oldAddress = await knexInstance<AddressModel>('addresses')
        .where({ zip_code: '11111-111' })
        .first();

      expect(oldAddress).toBeUndefined();
    });

    it('should replace single address with multiple addresses', async () => {
      const client = new ClientEntity({
        name: 'Fernanda Souza',
        email: 'fernanda@example.com',
        phone: '11222222222',
      });

      await clientRepository.create(client);

      await addressService.createMany([
        {
          street: 'Single Street',
          city: 'City',
          state: 'ST',
          zipCode: '11111-111',
          country: 'Country',
          clientId: client.id,
        },
      ]);

      const result = await updateClientUseCase.execute({
        clientId: client.id,
        addresses: [
          {
            street: 'First Street',
            city: 'City 1',
            state: 'S1',
            zipCode: '22222-222',
            country: 'Country 1',
          },
          {
            street: 'Second Street',
            city: 'City 2',
            state: 'S2',
            zipCode: '33333-333',
            country: 'Country 2',
          },
          {
            street: 'Third Street',
            city: 'City 3',
            state: 'S3',
            zipCode: '44444-444',
            country: 'Country 3',
          },
        ],
      });

      expect(result.id).toBe(client.id);

      const addressesInDb = await knexInstance<AddressModel>('addresses')
        .where({ client_id: client.id })
        .select();

      expect(addressesInDb).toHaveLength(3);

      const zipCodes = addressesInDb.map((addr) => addr.zip_code);
      expect(zipCodes).toContain('22222-222');
      expect(zipCodes).toContain('33333-333');
      expect(zipCodes).toContain('44444-444');
      expect(zipCodes).not.toContain('11111-111');
    });

    it('should update client and addresses together', async () => {
      const client = new ClientEntity({
        name: 'Roberto Silva',
        email: 'roberto@example.com',
        phone: '11111111111',
      });

      await clientRepository.create(client);

      await addressService.createMany([
        {
          street: 'Old Street',
          city: 'Old City',
          state: 'OC',
          zipCode: '99999-999',
          country: 'Old Country',
          clientId: client.id,
        },
      ]);

      const result = await updateClientUseCase.execute({
        clientId: client.id,
        name: 'Roberto Silva Santos',
        email: 'roberto.santos@example.com',
        addresses: [
          {
            street: 'New Street',
            city: 'New City',
            state: 'NC',
            zipCode: '88888-888',
            country: 'New Country',
          },
        ],
      });

      expect(result.name).toBe('Roberto Silva Santos');
      expect(result.email).toBe('roberto.santos@example.com');

      const addressesInDb = await knexInstance<AddressModel>('addresses')
        .where({ client_id: client.id })
        .select();

      expect(addressesInDb).toHaveLength(1);
      expect(addressesInDb[0].zip_code).toBe('88888-888');
    });

    it('should update address with complement', async () => {
      const client = new ClientEntity({
        name: 'Julia Martins',
        email: 'julia@example.com',
        phone: '11000000000',
      });

      await clientRepository.create(client);

      const result = await updateClientUseCase.execute({
        clientId: client.id,
        addresses: [
          {
            street: 'Main Street',
            city: 'Big City',
            state: 'BC',
            zipCode: '77777-777',
            country: 'Country',
            complement: 'Apartment 505',
          },
        ],
      });

      expect(result.id).toBe(client.id);

      const addressInDb = await knexInstance<AddressModel>('addresses')
        .where({ client_id: client.id })
        .first();

      expect(addressInDb!.complement).toBe('Apartment 505');
    });

    it('should not update fields that are not provided', async () => {
      const client = new ClientEntity({
        name: 'Marcelo Costa',
        email: 'marcelo@example.com',
        phone: '11999999998',
      });

      await clientRepository.create(client);

      const result = await updateClientUseCase.execute({
        clientId: client.id,
        name: 'Marcelo Costa Silva',
      });

      expect(result.name).toBe('Marcelo Costa Silva');
      expect(result.email).toBe('marcelo@example.com');
      expect(result.phone).toBe('11999999998');
    });

    it('should update same email for same client', async () => {
      const client = new ClientEntity({
        name: 'Laura Silva',
        email: 'laura@example.com',
        phone: '11888888887',
      });

      await clientRepository.create(client);

      const result = await updateClientUseCase.execute({
        clientId: client.id,
        email: 'laura@example.com',
      });

      expect(result.email).toBe('laura@example.com');
    });

    it('should update same phone for same client', async () => {
      const client = new ClientEntity({
        name: 'Diego Santos',
        email: 'diego@example.com',
        phone: '11777777776',
      });

      await clientRepository.create(client);

      const result = await updateClientUseCase.execute({
        clientId: client.id,
        phone: '11777777776',
      });

      expect(result.phone).toBe('11777777776');
    });
  });

  describe('execute - Error Cases', () => {
    it('should throw NotFoundError when client does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await expect(
        updateClientUseCase.execute({
          clientId: nonExistentId,
          name: 'New Name',
        }),
      ).rejects.toThrow(NotFoundError);

      await expect(
        updateClientUseCase.execute({
          clientId: nonExistentId,
          name: 'New Name',
        }),
      ).rejects.toThrow('Client not found');
    });

    it('should throw BadRequestError when email already exists for another client', async () => {
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

      await expect(
        updateClientUseCase.execute({
          clientId: client2.id,
          email: 'client1@example.com',
        }),
      ).rejects.toThrow(BadRequestError);

      await expect(
        updateClientUseCase.execute({
          clientId: client2.id,
          email: 'client1@example.com',
        }),
      ).rejects.toThrow('Client with same email already exists');
    });

    it('should throw BadRequestError with EMAIL_ALREADY_EXISTS code', async () => {
      const client1 = new ClientEntity({
        name: 'Client 1',
        email: 'test1@example.com',
        phone: '11111111111',
      });

      const client2 = new ClientEntity({
        name: 'Client 2',
        email: 'test2@example.com',
        phone: '22222222222',
      });

      await clientRepository.create(client1);
      await clientRepository.create(client2);

      try {
        await updateClientUseCase.execute({
          clientId: client2.id,
          email: 'test1@example.com',
        });
        fail('Should have thrown BadRequestError');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestError);
        expect((error as BadRequestError).errorCode).toBe(
          'EMAIL_ALREADY_EXISTS',
        );
      }
    });

    it('should throw BadRequestError when phone already exists for another client', async () => {
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

      await expect(
        updateClientUseCase.execute({
          clientId: client2.id,
          phone: '11111111111',
        }),
      ).rejects.toThrow(BadRequestError);

      await expect(
        updateClientUseCase.execute({
          clientId: client2.id,
          phone: '11111111111',
        }),
      ).rejects.toThrow('Client with same phone already exists');
    });

    it('should throw BadRequestError with PHONE_ALREADY_EXISTS code', async () => {
      const client1 = new ClientEntity({
        name: 'Client 1',
        email: 'phone1@example.com',
        phone: '11333333333',
      });

      const client2 = new ClientEntity({
        name: 'Client 2',
        email: 'phone2@example.com',
        phone: '22333333333',
      });

      await clientRepository.create(client1);
      await clientRepository.create(client2);

      try {
        await updateClientUseCase.execute({
          clientId: client2.id,
          phone: '11333333333',
        });
        fail('Should have thrown BadRequestError');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestError);
        expect((error as BadRequestError).errorCode).toBe(
          'PHONE_ALREADY_EXISTS',
        );
      }
    });

    it('should throw BadRequestError when zip code belongs to another client', async () => {
      const client1 = new ClientEntity({
        name: 'Client 1',
        email: 'zip1@example.com',
        phone: '11444444444',
      });

      const client2 = new ClientEntity({
        name: 'Client 2',
        email: 'zip2@example.com',
        phone: '22444444444',
      });

      await clientRepository.create(client1);
      await clientRepository.create(client2);

      await addressService.createMany([
        {
          street: 'Street 1',
          city: 'City 1',
          state: 'ST',
          zipCode: '55555-555',
          country: 'Country 1',
          clientId: client1.id,
        },
      ]);

      await expect(
        updateClientUseCase.execute({
          clientId: client2.id,
          addresses: [
            {
              street: 'Street 2',
              city: 'City 2',
              state: 'ST',
              zipCode: '55555-555',
              country: 'Country 2',
            },
          ],
        }),
      ).rejects.toThrow(BadRequestError);

      await expect(
        updateClientUseCase.execute({
          clientId: client2.id,
          addresses: [
            {
              street: 'Street 2',
              city: 'City 2',
              state: 'ST',
              zipCode: '55555-555',
              country: 'Country 2',
            },
          ],
        }),
      ).rejects.toThrow('Some addresses belong to another client');
    });

    it('should throw BadRequestError with ZIP_CODE_ALREADY_EXISTS code', async () => {
      const client1 = new ClientEntity({
        name: 'Client 1',
        email: 'zipcode1@example.com',
        phone: '11555555555',
      });

      const client2 = new ClientEntity({
        name: 'Client 2',
        email: 'zipcode2@example.com',
        phone: '22555555555',
      });

      await clientRepository.create(client1);
      await clientRepository.create(client2);

      await addressService.createMany([
        {
          street: 'Street 1',
          city: 'City 1',
          state: 'ST',
          zipCode: '66666-666',
          country: 'Country 1',
          clientId: client1.id,
        },
      ]);

      try {
        await updateClientUseCase.execute({
          clientId: client2.id,
          addresses: [
            {
              street: 'Street 2',
              city: 'City 2',
              state: 'ST',
              zipCode: '66666-666',
              country: 'Country 2',
            },
          ],
        });
        fail('Should have thrown BadRequestError');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestError);
        expect((error as BadRequestError).errorCode).toBe(
          'ZIP_CODE_ALREADY_EXISTS',
        );
      }
    });

    it('should not update when validation fails and rollback', async () => {
      const client1 = new ClientEntity({
        name: 'Client 1',
        email: 'rollback1@example.com',
        phone: '11666666666',
      });

      const client2 = new ClientEntity({
        name: 'Client 2',
        email: 'rollback2@example.com',
        phone: '22666666666',
      });

      await clientRepository.create(client1);
      await clientRepository.create(client2);

      try {
        await updateClientUseCase.execute({
          clientId: client2.id,
          name: 'New Name',
          email: 'rollback1@example.com',
        });
        fail('Should have thrown BadRequestError');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestError);
      }

      const client2InDb = await knexInstance<ClientModel>('clients')
        .where({ id: client2.id })
        .first();

      expect(client2InDb!.name).toBe('Client 2');
      expect(client2InDb!.email).toBe('rollback2@example.com');
    });
  });

  describe('execute - Edge Cases', () => {
    it('should handle updating to empty string values', async () => {
      const client = new ClientEntity({
        name: 'Test Client',
        email: 'test@example.com',
        phone: '11777777777',
      });

      await clientRepository.create(client);

      const result = await updateClientUseCase.execute({
        clientId: client.id,
        name: '',
      });

      expect(result.name).toBe('');
    });

    it('should handle removing all addresses', async () => {
      const client = new ClientEntity({
        name: 'Client With Addresses',
        email: 'addresses@example.com',
        phone: '11888888888',
      });

      await clientRepository.create(client);

      await addressService.createMany([
        {
          street: 'Street 1',
          city: 'City 1',
          state: 'ST',
          zipCode: '11111-111',
          country: 'Country 1',
          clientId: client.id,
        },
        {
          street: 'Street 2',
          city: 'City 2',
          state: 'ST',
          zipCode: '22222-222',
          country: 'Country 2',
          clientId: client.id,
        },
      ]);

      const addressesBefore = await knexInstance<AddressModel>('addresses')
        .where({ client_id: client.id })
        .select();
      expect(addressesBefore).toHaveLength(2);

      const result = await updateClientUseCase.execute({
        clientId: client.id,
        addresses: [],
      });

      expect(result.id).toBe(client.id);

      const addressesAfter = await knexInstance<AddressModel>('addresses')
        .where({ client_id: client.id })
        .select();
      expect(addressesAfter).toHaveLength(2);
    });

    it('should update client addresses with same zip codes (replacing own addresses)', async () => {
      const client = new ClientEntity({
        name: 'Replace Own Addresses',
        email: 'replace@example.com',
        phone: '11999999997',
      });

      await clientRepository.create(client);

      await addressService.createMany([
        {
          street: 'Old Street',
          city: 'Old City',
          state: 'OC',
          zipCode: '99999-999',
          country: 'Old Country',
          clientId: client.id,
        },
      ]);

      const result = await updateClientUseCase.execute({
        clientId: client.id,
        addresses: [
          {
            street: 'Updated Street',
            city: 'Updated City',
            state: 'UC',
            zipCode: '99999-999',
            country: 'Updated Country',
          },
        ],
      });

      expect(result.id).toBe(client.id);

      const addressInDb = await knexInstance<AddressModel>('addresses')
        .where({ client_id: client.id })
        .first();

      expect(addressInDb!.street).toBe('Updated Street');
      expect(addressInDb!.city).toBe('Updated City');
    });

    it('should maintain data consistency after multiple updates', async () => {
      const client = new ClientEntity({
        name: 'Multiple Updates',
        email: 'multiple@example.com',
        phone: '11000000001',
      });

      await clientRepository.create(client);

      await updateClientUseCase.execute({
        clientId: client.id,
        name: 'First Update',
      });

      await updateClientUseCase.execute({
        clientId: client.id,
        email: 'first@example.com',
      });

      await updateClientUseCase.execute({
        clientId: client.id,
        phone: '11000000002',
      });

      const result = await updateClientUseCase.execute({
        clientId: client.id,
        name: 'Final Update',
      });

      expect(result.name).toBe('Final Update');
      expect(result.email).toBe('first@example.com');
      expect(result.phone).toBe('11000000002');

      const clientInDb = await knexInstance<ClientModel>('clients')
        .where({ id: client.id })
        .first();

      expect(clientInDb!.name).toBe('Final Update');
      expect(clientInDb!.email).toBe('first@example.com');
      expect(clientInDb!.phone).toBe('11000000002');
    });

    it('should update timestamps correctly', async () => {
      const client = new ClientEntity({
        name: 'Timestamp Test',
        email: 'timestamp@example.com',
        phone: '11000000003',
      });

      await clientRepository.create(client);

      const clientBefore = await knexInstance<ClientModel>('clients')
        .where({ id: client.id })
        .first();

      await new Promise((resolve) => setTimeout(resolve, 10));

      await updateClientUseCase.execute({
        clientId: client.id,
        name: 'Updated Name',
      });

      const clientAfter = await knexInstance<ClientModel>('clients')
        .where({ id: client.id })
        .first();

      expect(clientAfter!.created_at).toEqual(clientBefore!.created_at);

      expect(clientAfter!.updated_at.getTime()).toBeGreaterThan(
        clientBefore!.updated_at.getTime(),
      );
    });

    it('should handle complex update scenario', async () => {
      const client = new ClientEntity({
        name: 'Complex Update',
        email: 'complex@example.com',
        phone: '11000000004',
      });

      await clientRepository.create(client);

      await addressService.createMany([
        {
          street: 'Street A',
          city: 'City A',
          state: 'SA',
          zipCode: 'AAAAA-AAA',
          country: 'Country A',
          clientId: client.id,
        },
        {
          street: 'Street B',
          city: 'City B',
          state: 'SB',
          zipCode: 'BBBBB-BBB',
          country: 'Country B',
          clientId: client.id,
        },
      ]);

      const result = await updateClientUseCase.execute({
        clientId: client.id,
        name: 'Updated Complex',
        email: 'updated.complex@example.com',
        phone: '11000000005',
        addresses: [
          {
            street: 'New Street 1',
            city: 'New City 1',
            state: 'N1',
            zipCode: '11111-111',
            country: 'New Country 1',
          },
          {
            street: 'New Street 2',
            city: 'New City 2',
            state: 'N2',
            zipCode: '22222-222',
            country: 'New Country 2',
            complement: 'Apt 100',
          },
        ],
      });

      expect(result.name).toBe('Updated Complex');
      expect(result.email).toBe('updated.complex@example.com');
      expect(result.phone).toBe('11000000005');

      const addressesInDb = await knexInstance<AddressModel>('addresses')
        .where({ client_id: client.id })
        .select();

      expect(addressesInDb).toHaveLength(2);

      const zipCodes = addressesInDb.map((addr) => addr.zip_code);
      expect(zipCodes).not.toContain('AAAAA-AAA');
      expect(zipCodes).not.toContain('BBBBB-BBB');
      expect(zipCodes).toContain('11111-111');
      expect(zipCodes).toContain('22222-222');

      const addressWithComplement = addressesInDb.find(
        (addr) => addr.zip_code === '22222-222',
      );
      expect(addressWithComplement!.complement).toBe('Apt 100');
    });
  });
});
