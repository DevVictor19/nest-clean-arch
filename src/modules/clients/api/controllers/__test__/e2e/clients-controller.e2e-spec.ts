/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test } from '@nestjs/testing';
import { Connection } from '@/core/infra/database/database-module';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Knex } from 'knex';
import {
  cleanupDatabaseContainer,
  cleanupTables,
  initDatabaseContainer,
} from '@/core/infra/tests';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import request from 'supertest';
import { ClientModel } from '@/modules/clients/infra/models';
import { AddressModel } from '@/modules/addresses/infra/models';
import { ClientRepository } from '@/modules/clients/domain/repositories';
import {
  CreateClientUseCase,
  DeleteClientUseCase,
  FindByIdClientUseCase,
  FindPaginatedClientsUseCase,
  UpdateClientUseCase,
} from '@/modules/clients/domain/usecases';
import { ClientPostgresRepository } from '@/modules/clients/infra/repositories';
import { ClientsController } from '../../clients-controller';
import { AddressRepository } from '@/modules/addresses/domain/repositories';
import { AddressService } from '@/modules/addresses/domain/services';
import { AddressPostgresRepository } from '@/modules/addresses/infra/repositories';
import { AddressServiceImpl } from '@/modules/addresses/infra/services';
import { ClientDto } from '../../../dtos';
import { AppErrorExceptionFilter } from '@/core/api/filters';

describe('ClientsController (e2e)', () => {
  let app: INestApplication;
  let container: StartedPostgreSqlContainer;
  let knexInstance: Knex;

  beforeAll(async () => {
    const instance = await initDatabaseContainer();
    container = instance.container;
    knexInstance = instance.knexInstance;

    const moduleRef = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [
        {
          provide: Connection,
          useValue: knexInstance,
        },
        {
          provide: ClientRepository,
          useClass: ClientPostgresRepository,
        },
        {
          provide: AddressRepository,
          useClass: AddressPostgresRepository,
        },
        {
          provide: AddressService,
          useClass: AddressServiceImpl,
        },
        CreateClientUseCase,
        DeleteClientUseCase,
        FindByIdClientUseCase,
        FindPaginatedClientsUseCase,
        UpdateClientUseCase,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.enableVersioning({
      type: VersioningType.URI,
    });
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new AppErrorExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
    await cleanupDatabaseContainer(container, knexInstance);
  });

  beforeEach(async () => {
    await cleanupTables(knexInstance);
  });

  describe('POST /api/v1/clients', () => {
    it('should create a client with addresses', async () => {
      const createDto = {
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

      const response = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send(createDto)
        .expect(201);

      expect(response.body as ClientDto).toMatchObject({
        id: expect.any(String),
        name: createDto.name,
        email: createDto.email,
        phone: createDto.phone,
      });

      const clientInDb = await knexInstance<ClientModel>('clients')
        .where({ email: createDto.email })
        .first();

      const addressInDb = await knexInstance<AddressModel>('addresses')
        .where({ client_id: clientInDb!.id })
        .first();

      expect(clientInDb).toBeDefined();
      expect(clientInDb!.name).toBe(createDto.name);
      expect(addressInDb).toBeDefined();
      expect(addressInDb!.street).toBe(createDto.addresses[0].street);
      expect(addressInDb!.city).toBe(createDto.addresses[0].city);
      expect(addressInDb!.state).toBe(createDto.addresses[0].state);
      expect(addressInDb!.zip_code).toBe(createDto.addresses[0].zipCode);
      expect(addressInDb!.country).toBe(createDto.addresses[0].country);
      expect(addressInDb!.client_id).toBe(clientInDb!.id);
    });

    it('should create a client with multiple addresses', async () => {
      const createDto = {
        name: 'Maria Santos',
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
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send(createDto)
        .expect(201);

      const addressesInDb = await knexInstance<AddressModel>('addresses')
        .where({ client_id: response.body.id })
        .select();

      expect(addressesInDb).toHaveLength(2);
    });

    it('should create a client with address containing complement', async () => {
      const createDto = {
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

      const response = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send(createDto)
        .expect(201);

      const responseBody: ClientDto = response.body;

      const addressInDb = await knexInstance<AddressModel>('addresses').where({
        client_id: responseBody.id,
      });

      expect(addressInDb[0].complement).toBe('Apto 101');
    });

    it('should return 400 when email already exists', async () => {
      const createDto = {
        name: 'Test Client',
        email: 'duplicate@example.com',
        phone: '11111111111',
        addresses: [
          {
            street: 'Street',
            city: 'City',
            state: 'ST',
            zipCode: '11111-111',
            country: 'Country',
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send(createDto)
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send({
          ...createDto,
          phone: '22222222222',
          addresses: [
            {
              street: 'Other Street',
              city: 'Other City',
              state: 'OT',
              zipCode: '22222-222',
              country: 'Other Country',
            },
          ],
        })
        .expect(400);

      expect(response.body.message).toContain('email already exists');
    });

    it('should return 400 when phone already exists', async () => {
      const createDto = {
        name: 'Test Client',
        email: 'test1@example.com',
        phone: '11333333333',
        addresses: [
          {
            street: 'Street',
            city: 'City',
            state: 'ST',
            zipCode: '11111-111',
            country: 'Country',
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send(createDto)
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send({
          ...createDto,
          email: 'test2@example.com',
          addresses: [
            {
              street: 'Other Street',
              city: 'Other City',
              state: 'OT',
              zipCode: '22222-222',
              country: 'Other Country',
            },
          ],
        })
        .expect(400);

      expect(response.body.message).toContain('phone already exists');
    });

    it('should return 400 when zip code already exists', async () => {
      const createDto = {
        name: 'Test Client',
        email: 'zip1@example.com',
        phone: '11444444444',
        addresses: [
          {
            street: 'Street',
            city: 'City',
            state: 'ST',
            zipCode: '55555-555',
            country: 'Country',
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send(createDto)
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send({
          name: 'Other Client',
          email: 'zip2@example.com',
          phone: '22444444444',
          addresses: [
            {
              street: 'Other Street',
              city: 'Other City',
              state: 'OT',
              zipCode: '55555-555',
              country: 'Other Country',
            },
          ],
        })
        .expect(400);

      expect(response.body.message).toContain('zip code already exists');
    });
  });

  describe('GET /api/v1/clients/:id', () => {
    it('should find a client by id', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send({
          name: 'Ana Costa',
          email: 'ana@example.com',
          phone: '11555555555',
          addresses: [
            {
              street: 'Rua Test',
              city: 'Test City',
              state: 'TC',
              zipCode: '12345-678',
              country: 'Test Country',
            },
          ],
        })
        .expect(201);

      const clientId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .get(`/api/v1/clients/${clientId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: clientId,
        name: 'Ana Costa',
        email: 'ana@example.com',
        phone: '11555555555',
        addresses: expect.arrayContaining([
          expect.objectContaining({
            street: 'Rua Test',
            city: 'Test City',
          }),
        ]),
      });
    });

    it('should return 404 when client does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app.getHttpServer())
        .get(`/api/v1/clients/${nonExistentId}`)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should return 400 when id is not a valid UUID', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/clients/invalid-uuid')
        .expect(400);
    });
  });

  describe('GET /api/v1/clients', () => {
    it('should return empty list when no clients exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/clients')
        .expect(200);

      expect(response.body).toMatchObject({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });
    });

    it('should return paginated list of clients', async () => {
      for (let i = 1; i <= 15; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/clients')
          .send({
            name: `Client ${i}`,
            email: `client${i}@example.com`,
            phone: `11${i.toString().padStart(9, '0')}`,
            addresses: [
              {
                street: `Street ${i}`,
                city: `City ${i}`,
                state: 'ST',
                zipCode: `${i.toString().padStart(5, '0')}-${i.toString().padStart(3, '0')}`,
                country: 'Country',
              },
            ],
          });
      }

      const page1Response = await request(app.getHttpServer())
        .get('/api/v1/clients')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(page1Response.body.data).toHaveLength(10);
      expect(page1Response.body.total).toBe(15);
      expect(page1Response.body.page).toBe(1);
      expect(page1Response.body.limit).toBe(10);

      const page2Response = await request(app.getHttpServer())
        .get('/api/v1/clients')
        .query({ page: 2, limit: 10 })
        .expect(200);

      expect(page2Response.body.data).toHaveLength(5);
      expect(page2Response.body.total).toBe(15);
      expect(page2Response.body.page).toBe(2);
    });

    it('should sort clients by name ascending', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send({
          name: 'Zebra Client',
          email: 'zebra@example.com',
          phone: '11111111111',
          addresses: [
            {
              street: 'Street',
              city: 'City',
              state: 'ST',
              zipCode: '11111-111',
              country: 'Country',
            },
          ],
        });

      await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send({
          name: 'Alpha Client',
          email: 'alpha@example.com',
          phone: '22222222222',
          addresses: [
            {
              street: 'Street',
              city: 'City',
              state: 'ST',
              zipCode: '22222-222',
              country: 'Country',
            },
          ],
        });

      await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send({
          name: 'Beta Client',
          email: 'beta@example.com',
          phone: '33333333333',
          addresses: [
            {
              street: 'Street',
              city: 'City',
              state: 'ST',
              zipCode: '33333-333',
              country: 'Country',
            },
          ],
        });

      const response = await request(app.getHttpServer())
        .get('/api/v1/clients')
        .query({ sortBy: 'name', sortOrder: 'asc' })
        .expect(200);

      expect(response.body.data[0].name).toBe('Alpha Client');
      expect(response.body.data[1].name).toBe('Beta Client');
      expect(response.body.data[2].name).toBe('Zebra Client');
    });

    it('should sort clients by name descending', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send({
          name: 'Zebra Client',
          email: 'zebra@example.com',
          phone: '11111111111',
          addresses: [
            {
              street: 'Street',
              city: 'City',
              state: 'ST',
              zipCode: '11111-111',
              country: 'Country',
            },
          ],
        });

      await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send({
          name: 'Alpha Client',
          email: 'alpha@example.com',
          phone: '22222222222',
          addresses: [
            {
              street: 'Street',
              city: 'City',
              state: 'ST',
              zipCode: '22222-222',
              country: 'Country',
            },
          ],
        });

      const response = await request(app.getHttpServer())
        .get('/api/v1/clients')
        .query({ sortBy: 'name', sortOrder: 'desc' })
        .expect(200);

      expect(response.body.data[0].name).toBe('Zebra Client');
      expect(response.body.data[1].name).toBe('Alpha Client');
    });

    it('should use default pagination values', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send({
          name: 'Test Client',
          email: 'test@example.com',
          phone: '11111111111',
          addresses: [
            {
              street: 'Street',
              city: 'City',
              state: 'ST',
              zipCode: '11111-111',
              country: 'Country',
            },
          ],
        });

      const response = await request(app.getHttpServer())
        .get('/api/v1/clients')
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
    });
  });

  describe('PUT /api/v1/clients/:id', () => {
    it('should update client name', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send({
          name: 'Original Name',
          email: 'original@example.com',
          phone: '11666666666',
          addresses: [
            {
              street: 'Street',
              city: 'City',
              state: 'ST',
              zipCode: '11111-111',
              country: 'Country',
            },
          ],
        })
        .expect(201);

      const clientId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .put(`/api/v1/clients/${clientId}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
      expect(response.body.email).toBe('original@example.com');
      expect(response.body.phone).toBe('11666666666');
    });

    it('should update client email', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send({
          name: 'Test Client',
          email: 'old@example.com',
          phone: '11777777777',
          addresses: [
            {
              street: 'Street',
              city: 'City',
              state: 'ST',
              zipCode: '22222-222',
              country: 'Country',
            },
          ],
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .put(`/api/v1/clients/${createResponse.body.id}`)
        .send({ email: 'new@example.com' })
        .expect(200);

      expect(response.body.email).toBe('new@example.com');
    });

    it('should update client phone', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send({
          name: 'Test Client',
          email: 'phone@example.com',
          phone: '11888888888',
          addresses: [
            {
              street: 'Street',
              city: 'City',
              state: 'ST',
              zipCode: '33333-333',
              country: 'Country',
            },
          ],
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .put(`/api/v1/clients/${createResponse.body.id}`)
        .send({ phone: '11999999997' })
        .expect(200);

      expect(response.body.phone).toBe('11999999997');
    });

    it('should update multiple fields at once', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send({
          name: 'Original',
          email: 'original@example.com',
          phone: '11000000000',
          addresses: [
            {
              street: 'Street',
              city: 'City',
              state: 'ST',
              zipCode: '44444-444',
              country: 'Country',
            },
          ],
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .put(`/api/v1/clients/${createResponse.body.id}`)
        .send({
          name: 'Updated',
          email: 'updated@example.com',
          phone: '11000000001',
        })
        .expect(200);

      expect(response.body.name).toBe('Updated');
      expect(response.body.email).toBe('updated@example.com');
      expect(response.body.phone).toBe('11000000001');
    });

    it('should update client addresses', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send({
          name: 'Test Client',
          email: 'address@example.com',
          phone: '11000000002',
          addresses: [
            {
              street: 'Old Street',
              city: 'Old City',
              state: 'OC',
              zipCode: '55555-555',
              country: 'Old Country',
            },
          ],
        })
        .expect(201);

      let addressesInDb = await knexInstance<AddressModel>('addresses')
        .where({ client_id: createResponse.body.id })
        .select();

      expect(addressesInDb).toHaveLength(1);
      expect(addressesInDb[0].street).toBe('Old Street');
      expect(addressesInDb[0].city).toBe('Old City');
      expect(addressesInDb[0].state).toBe('OC');
      expect(addressesInDb[0].zip_code).toBe('55555-555');
      expect(addressesInDb[0].country).toBe('Old Country');

      await request(app.getHttpServer())
        .put(`/api/v1/clients/${createResponse.body.id}`)
        .send({
          addresses: [
            {
              street: 'New Street',
              city: 'New City',
              state: 'NC',
              zipCode: '66666-666',
              country: 'New Country',
            },
          ],
        })
        .expect(200);

      addressesInDb = await knexInstance<AddressModel>('addresses')
        .where({ client_id: createResponse.body.id })
        .select();

      expect(addressesInDb).toHaveLength(1);
      expect(addressesInDb[0].street).toBe('New Street');
      expect(addressesInDb[0].city).toBe('New City');
      expect(addressesInDb[0].state).toBe('NC');
      expect(addressesInDb[0].zip_code).toBe('66666-666');
      expect(addressesInDb[0].country).toBe('New Country');
    });

    it('should return 404 when client does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app.getHttpServer())
        .put(`/api/v1/clients/${nonExistentId}`)
        .send({ name: 'New Name' })
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should return 400 when email already exists for another client', async () => {
      const client1Response = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send({
          name: 'Client 1',
          email: 'client1@example.com',
          phone: '11111111112',
          addresses: [
            {
              street: 'Street 1',
              city: 'City 1',
              state: 'S1',
              zipCode: '77777-777',
              country: 'Country 1',
            },
          ],
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send({
          name: 'Client 2',
          email: 'client2@example.com',
          phone: '22222222223',
          addresses: [
            {
              street: 'Street 2',
              city: 'City 2',
              state: 'S2',
              zipCode: '88888-888',
              country: 'Country 2',
            },
          ],
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .put(`/api/v1/clients/${client1Response.body.id}`)
        .send({ email: 'client2@example.com' })
        .expect(400);

      expect(response.body.message).toContain('email already exists');
    });

    it('should return 400 when phone already exists for another client', async () => {
      const client1Response = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send({
          name: 'Client 1',
          email: 'phone1@example.com',
          phone: '11111111113',
          addresses: [
            {
              street: 'Street 1',
              city: 'City 1',
              state: 'S1',
              zipCode: '99999-997',
              country: 'Country 1',
            },
          ],
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send({
          name: 'Client 2',
          email: 'phone2@example.com',
          phone: '22222222224',
          addresses: [
            {
              street: 'Street 2',
              city: 'City 2',
              state: 'S2',
              zipCode: '99999-998',
              country: 'Country 2',
            },
          ],
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .put(`/api/v1/clients/${client1Response.body.id}`)
        .send({ phone: '22222222224' })
        .expect(400);

      expect(response.body.message).toContain('phone already exists');
    });
  });

  describe('DELETE /api/v1/clients/:id', () => {
    it('should delete a client', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send({
          name: 'To Delete',
          email: 'delete@example.com',
          phone: '11000000003',
          addresses: [
            {
              street: 'Street',
              city: 'City',
              state: 'ST',
              zipCode: '99999-999',
              country: 'Country',
            },
          ],
        })
        .expect(201);

      const clientId = createResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/api/v1/clients/${clientId}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/v1/clients/${clientId}`)
        .expect(404);

      const clientInDb = await knexInstance<ClientModel>('clients')
        .where({ id: clientId })
        .first();

      expect(clientInDb).toBeUndefined();
    });

    it('should delete client and cascade delete addresses', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send({
          name: 'To Delete With Addresses',
          email: 'deletewithaddr@example.com',
          phone: '11000000004',
          addresses: [
            {
              street: 'Street 1',
              city: 'City 1',
              state: 'S1',
              zipCode: 'AAAAA-AAA',
              country: 'Country 1',
            },
            {
              street: 'Street 2',
              city: 'City 2',
              state: 'S2',
              zipCode: 'BBBBB-BBB',
              country: 'Country 2',
            },
          ],
        })
        .expect(201);

      const clientId = createResponse.body.id;

      const addressesBefore = await knexInstance<AddressModel>('addresses')
        .where({ client_id: clientId })
        .select();
      expect(addressesBefore).toHaveLength(2);

      await request(app.getHttpServer())
        .delete(`/api/v1/clients/${clientId}`)
        .expect(200);

      const addressesAfter = await knexInstance<AddressModel>('addresses')
        .where({ client_id: clientId })
        .select();
      expect(addressesAfter).toHaveLength(0);
    });

    it('should return 200 when deleting non-existent client (idempotent)', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .delete(`/api/v1/clients/${nonExistentId}`)
        .expect(200);
    });

    it('should return 400 when id is not a valid UUID', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/clients/invalid-uuid')
        .expect(400);
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle complete CRUD workflow', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send({
          name: 'CRUD Test',
          email: 'crud@example.com',
          phone: '11000000005',
          addresses: [
            {
              street: 'Initial Street',
              city: 'Initial City',
              state: 'IC',
              zipCode: 'CCCCC-CCC',
              country: 'Initial Country',
            },
          ],
        })
        .expect(201);

      const clientId = createResponse.body.id;

      const readResponse = await request(app.getHttpServer())
        .get(`/api/v1/clients/${clientId}`)
        .expect(200);

      expect(readResponse.body.name).toBe('CRUD Test');

      const updateResponse = await request(app.getHttpServer())
        .put(`/api/v1/clients/${clientId}`)
        .send({
          name: 'CRUD Test Updated',
          addresses: [
            {
              street: 'Updated Street',
              city: 'Updated City',
              state: 'UC',
              zipCode: 'DDDDD-DDD',
              country: 'Updated Country',
            },
          ],
        })
        .expect(200);

      const addressInDb = await knexInstance<AddressModel>('addresses')
        .where({ client_id: clientId })
        .first();

      expect(updateResponse.body.name).toBe('CRUD Test Updated');
      expect(addressInDb!.street).toBe('Updated Street');
      expect(addressInDb!.city).toBe('Updated City');
      expect(addressInDb!.state).toBe('UC');
      expect(addressInDb!.zip_code).toBe('DDDDD-DDD');
      expect(addressInDb!.country).toBe('Updated Country');

      await request(app.getHttpServer())
        .delete(`/api/v1/clients/${clientId}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/v1/clients/${clientId}`)
        .expect(404);
    });

    it('should handle pagination with filtering and sorting', async () => {
      for (let i = 1; i <= 20; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/clients')
          .send({
            name: i % 2 === 0 ? `Premium Client ${i}` : `Regular Client ${i}`,
            email: `client${i}@example.com`,
            phone: `11${i.toString().padStart(9, '0')}`,
            addresses: [
              {
                street: `Street ${i}`,
                city: `City ${i}`,
                state: 'ST',
                zipCode: `${i.toString().padStart(5, '0')}-${i.toString().padStart(3, '0')}`,
                country: 'Country',
              },
            ],
          });
      }

      const response = await request(app.getHttpServer())
        .get('/api/v1/clients')
        .query({ page: 1, limit: 5, sortBy: 'name', sortOrder: 'asc' })
        .expect(200);

      expect(response.body.data).toHaveLength(5);
      expect(response.body.total).toBe(20);
    });

    it('should maintain data consistency across multiple operations', async () => {
      const client1 = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send({
          name: 'Client 1',
          email: 'consistency1@example.com',
          phone: '11000000006',
          addresses: [
            {
              street: 'Street 1',
              city: 'City 1',
              state: 'S1',
              zipCode: 'EEEEE-EEE',
              country: 'Country 1',
            },
          ],
        })
        .expect(201);

      const client2 = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .send({
          name: 'Client 2',
          email: 'consistency2@example.com',
          phone: '11000000007',
          addresses: [
            {
              street: 'Street 2',
              city: 'City 2',
              state: 'S2',
              zipCode: 'FFFFF-FFF',
              country: 'Country 2',
            },
          ],
        })
        .expect(201);

      await request(app.getHttpServer())
        .put(`/api/v1/clients/${client1.body.id}`)
        .send({ name: 'Client 1 Updated' })
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/api/v1/clients/${client2.body.id}`)
        .expect(200);

      const listResponse = await request(app.getHttpServer())
        .get('/api/v1/clients')
        .expect(200);

      expect(listResponse.body.total).toBe(1);
      expect(listResponse.body.data[0].name).toBe('Client 1 Updated');
    });
  });
});
