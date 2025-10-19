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
import { CreateClientUseCase } from '../../create-client-usecase';
import { ClientPostgresRepository } from '@/modules/clients/infra/repositories';
import { AddressServiceImpl } from '@/modules/addresses/infra/services';
import { AddressRepository } from '@/modules/addresses/domain/repositories';
import { AddressPostgresRepository } from '@/modules/addresses/infra/repositories';
import { BadRequestError } from '@/core/domain/errors/base-errors';
import { ClientEntity } from '../../../entities';
import { ClientModel } from '@/modules/clients/infra/models';
import { AddressModel } from '@/modules/addresses/infra/models';

describe('CreateClientUseCase Integration Tests', () => {
  let createClientUseCase: CreateClientUseCase;
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
        CreateClientUseCase,
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

    createClientUseCase =
      moduleRef.get<CreateClientUseCase>(CreateClientUseCase);
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
    it('should create a client with a single address', async () => {
      const input = {
        name: 'João Silva',
        email: 'joao@example.com',
        phone: '11999999999',
        addresses: [
          {
            street: 'Rua A',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01234-567',
            country: 'Brasil',
          },
        ],
      };

      const result = await createClientUseCase.execute(input);

      expect(result).toBeInstanceOf(ClientEntity);
      expect(result.id).toBeDefined();
      expect(result.name).toBe(input.name);
      expect(result.email).toBe(input.email);
      expect(result.phone).toBe(input.phone);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);

      const clientInDb = await knexInstance<ClientModel>('clients')
        .where({ id: result.id })
        .first();

      expect(clientInDb).toBeDefined();
      expect(clientInDb!.name).toBe(input.name);
      expect(clientInDb!.email).toBe(input.email);
      expect(clientInDb!.phone).toBe(input.phone);

      const addressesInDb = await knexInstance<AddressModel>('addresses')
        .where({ client_id: result.id })
        .select();

      expect(addressesInDb).toHaveLength(1);
      expect(addressesInDb[0].street).toBe(input.addresses[0].street);
      expect(addressesInDb[0].city).toBe(input.addresses[0].city);
      expect(addressesInDb[0].state).toBe(input.addresses[0].state);
      expect(addressesInDb[0].zip_code).toBe(input.addresses[0].zipCode);
      expect(addressesInDb[0].country).toBe(input.addresses[0].country);
    });

    it('should create a client with multiple addresses', async () => {
      const input = {
        name: 'Maria Souza',
        email: 'maria@example.com',
        phone: '11888888888',
        addresses: [
          {
            street: 'Rua A',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01234-567',
            country: 'Brasil',
          },
          {
            street: 'Rua B',
            city: 'Rio de Janeiro',
            state: 'RJ',
            zipCode: '98765-432',
            country: 'Brasil',
          },
          {
            street: 'Rua C',
            city: 'Belo Horizonte',
            state: 'MG',
            zipCode: '11111-222',
            country: 'Brasil',
          },
        ],
      };

      const result = await createClientUseCase.execute(input);

      expect(result).toBeInstanceOf(ClientEntity);
      expect(result.id).toBeDefined();

      const addressesInDb = await knexInstance<AddressModel>('addresses')
        .where({ client_id: result.id })
        .select();

      expect(addressesInDb).toHaveLength(3);

      const zipCodes = addressesInDb.map((addr) => addr.zip_code);
      expect(zipCodes).toContain('01234-567');
      expect(zipCodes).toContain('98765-432');
      expect(zipCodes).toContain('11111-222');
    });

    it('should create a client with address containing optional complement', async () => {
      const input = {
        name: 'Carlos Lima',
        email: 'carlos@example.com',
        phone: '11777777777',
        addresses: [
          {
            street: 'Rua Principal',
            city: 'Campinas',
            state: 'SP',
            zipCode: '13000-000',
            country: 'Brasil',
            complement: 'Apto 101',
          },
        ],
      };

      const result = await createClientUseCase.execute(input);

      expect(result).toBeInstanceOf(ClientEntity);

      const addressInDb = await knexInstance<AddressModel>('addresses')
        .where({ client_id: result.id })
        .first();

      expect(addressInDb).toBeDefined();
      expect(addressInDb!.complement).toBe('Apto 101');
    });

    it('should create multiple clients with different data', async () => {
      const input1 = {
        name: 'Client 1',
        email: 'client1@example.com',
        phone: '11111111111',
        addresses: [
          {
            street: 'Street 1',
            city: 'City 1',
            state: 'ST',
            zipCode: '11111-111',
            country: 'Country 1',
          },
        ],
      };

      const input2 = {
        name: 'Client 2',
        email: 'client2@example.com',
        phone: '22222222222',
        addresses: [
          {
            street: 'Street 2',
            city: 'City 2',
            state: 'ST',
            zipCode: '22222-222',
            country: 'Country 2',
          },
        ],
      };

      const result1 = await createClientUseCase.execute(input1);
      const result2 = await createClientUseCase.execute(input2);

      expect(result1.id).not.toBe(result2.id);
      expect(result1.email).toBe(input1.email);
      expect(result2.email).toBe(input2.email);

      const clientsInDb = await knexInstance<ClientModel>('clients')
        .select()
        .orderBy('created_at', 'asc');

      expect(clientsInDb).toHaveLength(2);
    });
  });

  describe('execute - Error Cases', () => {
    it('should throw BadRequestError when email already exists', async () => {
      const existingClient = new ClientEntity({
        name: 'Existing Client',
        email: 'duplicate@example.com',
        phone: '11999999999',
      });

      await clientRepository.create(existingClient);

      const input = {
        name: 'New Client',
        email: 'duplicate@example.com',
        phone: '11888888888',
        addresses: [
          {
            street: 'Rua A',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01234-567',
            country: 'Brasil',
          },
        ],
      };

      await expect(createClientUseCase.execute(input)).rejects.toThrow(
        BadRequestError,
      );

      await expect(createClientUseCase.execute(input)).rejects.toThrow(
        'Client with same email already exists',
      );

      const clientsInDb = await knexInstance<ClientModel>('clients').select();
      expect(clientsInDb).toHaveLength(1);
    });

    it('should throw BadRequestError with EMAIL_ALREADY_EXISTS code when email exists', async () => {
      const existingClient = new ClientEntity({
        name: 'Existing Client',
        email: 'test@example.com',
        phone: '11999999999',
      });

      await clientRepository.create(existingClient);

      const input = {
        name: 'New Client',
        email: 'test@example.com',
        phone: '11888888888',
        addresses: [
          {
            street: 'Rua A',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01234-567',
            country: 'Brasil',
          },
        ],
      };

      try {
        await createClientUseCase.execute(input);
        fail('Should have thrown BadRequestError');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestError);
        expect((error as BadRequestError).errorCode).toBe(
          'EMAIL_ALREADY_EXISTS',
        );
      }
    });

    it('should throw BadRequestError when phone already exists', async () => {
      const existingClient = new ClientEntity({
        name: 'Existing Client',
        email: 'existing@example.com',
        phone: '11999999999',
      });

      await clientRepository.create(existingClient);

      const input = {
        name: 'New Client',
        email: 'new@example.com',
        phone: '11999999999',
        addresses: [
          {
            street: 'Rua A',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01234-567',
            country: 'Brasil',
          },
        ],
      };

      await expect(createClientUseCase.execute(input)).rejects.toThrow(
        BadRequestError,
      );

      await expect(createClientUseCase.execute(input)).rejects.toThrow(
        'Client with same phone already exists',
      );

      const clientsInDb = await knexInstance<ClientModel>('clients').select();
      expect(clientsInDb).toHaveLength(1);
    });

    it('should throw BadRequestError with PHONE_ALREADY_EXISTS code when phone exists', async () => {
      const existingClient = new ClientEntity({
        name: 'Existing Client',
        email: 'existing@example.com',
        phone: '11777777777',
      });

      await clientRepository.create(existingClient);

      const input = {
        name: 'New Client',
        email: 'new@example.com',
        phone: '11777777777',
        addresses: [
          {
            street: 'Rua A',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01234-567',
            country: 'Brasil',
          },
        ],
      };

      try {
        await createClientUseCase.execute(input);
        fail('Should have thrown BadRequestError');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestError);
        expect((error as BadRequestError).errorCode).toBe(
          'PHONE_ALREADY_EXISTS',
        );
      }
    });

    it('should throw BadRequestError when zip code already exists', async () => {
      const existingClient = new ClientEntity({
        name: 'Existing Client',
        email: 'existing@example.com',
        phone: '11999999999',
      });

      await clientRepository.create(existingClient);

      await addressService.createMany([
        {
          street: 'Rua Existente',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234-567',
          country: 'Brasil',
          clientId: existingClient.id,
        },
      ]);

      const input = {
        name: 'New Client',
        email: 'new@example.com',
        phone: '11888888888',
        addresses: [
          {
            street: 'Rua Nova',
            city: 'Rio de Janeiro',
            state: 'RJ',
            zipCode: '01234-567',
            country: 'Brasil',
          },
        ],
      };

      await expect(createClientUseCase.execute(input)).rejects.toThrow(
        BadRequestError,
      );

      await expect(createClientUseCase.execute(input)).rejects.toThrow(
        'Some addresses with same zip code already exists',
      );

      const clientsInDb = await knexInstance<ClientModel>('clients').select();
      expect(clientsInDb).toHaveLength(1);

      const addressesInDb =
        await knexInstance<AddressModel>('addresses').select();
      expect(addressesInDb).toHaveLength(1);
    });

    it('should throw BadRequestError with ZIP_CODE_ALREADY_EXISTS code when zip code exists', async () => {
      const existingClient = new ClientEntity({
        name: 'Existing Client',
        email: 'existing@example.com',
        phone: '11999999999',
      });

      await clientRepository.create(existingClient);

      await addressService.createMany([
        {
          street: 'Rua Existente',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '99999-999',
          country: 'Brasil',
          clientId: existingClient.id,
        },
      ]);

      const input = {
        name: 'New Client',
        email: 'new@example.com',
        phone: '11888888888',
        addresses: [
          {
            street: 'Rua Nova',
            city: 'Rio de Janeiro',
            state: 'RJ',
            zipCode: '99999-999',
            country: 'Brasil',
          },
        ],
      };

      try {
        await createClientUseCase.execute(input);
        fail('Should have thrown BadRequestError');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestError);
        expect((error as BadRequestError).errorCode).toBe(
          'ZIP_CODE_ALREADY_EXISTS',
        );
      }
    });

    it('should throw BadRequestError when multiple zip codes already exist', async () => {
      const existingClient = new ClientEntity({
        name: 'Existing Client',
        email: 'existing@example.com',
        phone: '11999999999',
      });

      await clientRepository.create(existingClient);

      await addressService.createMany([
        {
          street: 'Rua 1',
          city: 'City 1',
          state: 'ST',
          zipCode: '11111-111',
          country: 'Country 1',
          clientId: existingClient.id,
        },
        {
          street: 'Rua 2',
          city: 'City 2',
          state: 'ST',
          zipCode: '22222-222',
          country: 'Country 2',
          clientId: existingClient.id,
        },
      ]);

      const input = {
        name: 'New Client',
        email: 'new@example.com',
        phone: '11888888888',
        addresses: [
          {
            street: 'Rua Nova 1',
            city: 'City 3',
            state: 'ST',
            zipCode: '11111-111',
            country: 'Country 3',
          },
          {
            street: 'Rua Nova 2',
            city: 'City 4',
            state: 'ST',
            zipCode: '22222-222',
            country: 'Country 4',
          },
        ],
      };

      await expect(createClientUseCase.execute(input)).rejects.toThrow(
        BadRequestError,
      );

      await expect(createClientUseCase.execute(input)).rejects.toThrow(
        'Some addresses with same zip code already exists',
      );
    });

    it('should throw BadRequestError when at least one zip code already exists', async () => {
      const existingClient = new ClientEntity({
        name: 'Existing Client',
        email: 'existing@example.com',
        phone: '11999999999',
      });

      await clientRepository.create(existingClient);

      await addressService.createMany([
        {
          street: 'Rua Existente',
          city: 'City',
          state: 'ST',
          zipCode: '55555-555',
          country: 'Country',
          clientId: existingClient.id,
        },
      ]);

      const input = {
        name: 'New Client',
        email: 'new@example.com',
        phone: '11888888888',
        addresses: [
          {
            street: 'Rua Nova 1',
            city: 'City 1',
            state: 'ST',
            zipCode: '55555-555',
            country: 'Country 1',
          },
          {
            street: 'Rua Nova 2',
            city: 'City 2',
            state: 'ST',
            zipCode: '66666-666',
            country: 'Country 2',
          },
        ],
      };

      await expect(createClientUseCase.execute(input)).rejects.toThrow(
        BadRequestError,
      );
    });
  });

  describe('execute - Edge Cases', () => {
    it('should handle concurrent validations correctly', async () => {
      const input = {
        name: 'Test Client',
        email: 'test@example.com',
        phone: '11999999999',
        addresses: [
          {
            street: 'Rua Test',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '12345-678',
            country: 'Brasil',
          },
        ],
      };

      const result = await createClientUseCase.execute(input);

      expect(result).toBeInstanceOf(ClientEntity);

      const clientByEmail = await clientRepository.findByEmail(input.email);
      const clientByPhone = await clientRepository.findByPhone(input.phone);
      const addressesByZipCode = await addressService.findByZipCodes([
        input.addresses[0].zipCode,
      ]);

      expect(clientByEmail).not.toBeNull();
      expect(clientByPhone).not.toBeNull();
      expect(addressesByZipCode).toHaveLength(1);
    });

    it('should create client and addresses in correct order', async () => {
      const input = {
        name: 'Order Test',
        email: 'order@example.com',
        phone: '11777777777',
        addresses: [
          {
            street: 'Rua A',
            city: 'City A',
            state: 'ST',
            zipCode: '11111-111',
            country: 'Country A',
          },
        ],
      };

      const result = await createClientUseCase.execute(input);

      const clientInDb = await knexInstance<ClientModel>('clients')
        .where({ id: result.id })
        .first();

      expect(clientInDb).toBeDefined();

      const addressesInDb = await knexInstance<AddressModel>('addresses')
        .where({ client_id: result.id })
        .select();

      expect(addressesInDb).toHaveLength(1);
      expect(addressesInDb[0].client_id).toBe(result.id);
    });

    it('should handle addresses without complement field', async () => {
      const input = {
        name: 'No Complement Client',
        email: 'nocomplement@example.com',
        phone: '11666666666',
        addresses: [
          {
            street: 'Rua Sem Complemento',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '88888-888',
            country: 'Brasil',
          },
        ],
      };

      const result = await createClientUseCase.execute(input);

      expect(result).toBeInstanceOf(ClientEntity);

      const addressInDb = await knexInstance<AddressModel>('addresses')
        .where({ client_id: result.id })
        .first();

      expect(addressInDb).toBeDefined();
      expect(addressInDb!.complement).toBeNull();
    });
  });
});
