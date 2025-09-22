import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { knex, Knex } from 'knex';
import { BasePostgresRepository } from '../../base-postgres-repository';
import {
  BaseEntity,
  BaseEntityProps,
} from '@/core/domain/entities/base-entity';
import { BaseModel } from '../../../models/base-model';

type TestEntityProps = BaseEntityProps & {
  name: string;
  email: string;
};

class TestEntity extends BaseEntity {
  name: string;
  email: string;

  constructor(props: TestEntityProps) {
    const { id, createdAt, updatedAt, ...rest } = props;
    super({ id, createdAt, updatedAt });
    Object.assign(this, rest);
  }
}

interface TestModel extends BaseModel {
  name: string;
  email: string;
}

class TestPostgresRepository extends BasePostgresRepository<
  TestEntity,
  TestModel
> {
  constructor(manager: Knex) {
    super(manager, 'test_entities');
  }

  toModel(entity: TestEntity): TestModel {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    };
  }

  toEntity(model: TestModel): TestEntity {
    return new TestEntity({
      id: model.id,
      name: model.name,
      email: model.email,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
    });
  }

  toCollection(models: TestModel[]): TestEntity[] {
    return models.map((model) => this.toEntity(model));
  }
}

describe('BasePostgresRepository Integration Tests', () => {
  let container: StartedPostgreSqlContainer;
  let knexInstance: Knex;
  let repository: TestPostgresRepository;

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

    await knexInstance.schema.createTable('test_entities', (table) => {
      table.uuid('id').primary();
      table.string('name').notNullable();
      table.string('email').unique().notNullable();
      table
        .timestamp('created_at')
        .notNullable()
        .defaultTo(knexInstance.fn.now());
      table
        .timestamp('updated_at')
        .notNullable()
        .defaultTo(knexInstance.fn.now());
    });

    repository = new TestPostgresRepository(knexInstance);
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
    await knexInstance('test_entities').del();
  });

  describe('create', () => {
    it('should create a new entity and return it with generated id and timestamps', async () => {
      const entityData = {
        name: 'John Doe',
        email: 'john.doe@example.com',
      };
      const entity = new TestEntity(entityData);

      const result = await repository.create(entity);

      expect(result).toBeInstanceOf(TestEntity);
      expect(result.id).toBeDefined();
      expect(result.name).toBe(entityData.name);
      expect(result.email).toBe(entityData.email);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);

      const dbRecord = (await knexInstance('test_entities')
        .where({ id: result.id })
        .first()) as TestModel;

      expect(dbRecord).toBeDefined();
      expect(dbRecord.name).toBe(entityData.name);
      expect(dbRecord.email).toBe(entityData.email);
    });

    it('should preserve provided id, createdAt, and updatedAt when creating entity', async () => {
      const fixedDate = new Date('2024-01-01T00:00:00.000Z');
      const entityData = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        createdAt: fixedDate,
        updatedAt: fixedDate,
      };
      const entity = new TestEntity(entityData);

      const result = await repository.create(entity);

      expect(result.id).toBe(entityData.id);
      expect(result.createdAt).toEqual(fixedDate);
      expect(result.updatedAt).toEqual(fixedDate);
    });
  });

  describe('createMany', () => {
    it('should create multiple entities in a single operation', async () => {
      const entities = [
        new TestEntity({ name: 'User 1', email: 'user1@example.com' }),
        new TestEntity({ name: 'User 2', email: 'user2@example.com' }),
        new TestEntity({ name: 'User 3', email: 'user3@example.com' }),
      ];

      await repository.createMany(entities);

      const dbRecords = await knexInstance('test_entities').select('*');
      expect(dbRecords).toHaveLength(3);

      const emails = (dbRecords as TestModel[])
        .map((record) => record.email)
        .sort();
      expect(emails).toEqual([
        'user1@example.com',
        'user2@example.com',
        'user3@example.com',
      ]);
    });

    it('should handle empty array without errors', async () => {
      await expect(repository.createMany([])).resolves.not.toThrow();

      const dbRecords = await knexInstance('test_entities').select('*');
      expect(dbRecords).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('should return entity when found by id', async () => {
      const entity = new TestEntity({
        name: 'John Doe',
        email: 'john.doe@example.com',
      });
      const createdEntity = await repository.create(entity);

      const result = await repository.findById(createdEntity.id);

      expect(result).toBeInstanceOf(TestEntity);
      expect(result?.id).toBe(createdEntity.id);
      expect(result?.name).toBe('John Doe');
      expect(result?.email).toBe('john.doe@example.com');
    });

    it('should return null when entity not found', async () => {
      const result = await repository.findById(
        '550e8400-e29b-41d4-a716-446655440999',
      );

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all entities from the table', async () => {
      const entities = [
        new TestEntity({ name: 'User 1', email: 'user1@example.com' }),
        new TestEntity({ name: 'User 2', email: 'user2@example.com' }),
      ];
      await repository.createMany(entities);

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result.every((entity) => entity instanceof TestEntity)).toBe(true);

      const names = result.map((entity) => entity.name).sort();
      expect(names).toEqual(['User 1', 'User 2']);
    });

    it('should return empty array when no entities exist', async () => {
      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update existing entity and return updated version', async () => {
      const entity = new TestEntity({
        name: 'John Doe',
        email: 'john.doe@example.com',
      });
      const createdEntity = await repository.create(entity);

      createdEntity.name = 'John Smith';
      createdEntity.email = 'john.smith@example.com';

      const result = await repository.update(createdEntity);

      expect(result).toBeInstanceOf(TestEntity);
      expect(result.id).toBe(createdEntity.id);
      expect(result.name).toBe('John Smith');
      expect(result.email).toBe('john.smith@example.com');
      expect(result.updatedAt.getTime()).toBeGreaterThan(
        result.createdAt.getTime(),
      );

      const dbRecord = (await knexInstance('test_entities')
        .where({ id: result.id })
        .first()) as TestModel;
      expect(dbRecord.name).toBe('John Smith');
      expect(dbRecord.email).toBe('john.smith@example.com');
    });

    it('should update updatedAt timestamp when updating entity', async () => {
      const entity = new TestEntity({
        name: 'John Doe',
        email: 'john.doe@example.com',
      });
      const createdEntity = await repository.create(entity);
      const originalUpdatedAt = createdEntity.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      createdEntity.name = 'Updated Name';

      const result = await repository.update(createdEntity);

      expect(result.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime(),
      );
    });
  });

  describe('delete', () => {
    it('should delete entity by id', async () => {
      const entity = new TestEntity({
        name: 'John Doe',
        email: 'john.doe@example.com',
      });
      const createdEntity = await repository.create(entity);

      let dbRecord = (await knexInstance('test_entities')
        .where({ id: createdEntity.id })
        .first()) as TestModel | undefined;
      expect(dbRecord).toBeDefined();

      await repository.delete(createdEntity.id);

      dbRecord = (await knexInstance('test_entities')
        .where({ id: createdEntity.id })
        .first()) as TestModel | undefined;
      expect(dbRecord).toBeUndefined();
    });

    it('should not throw error when deleting non-existent entity', async () => {
      await expect(
        repository.delete('550e8400-e29b-41d4-a716-446655440999'),
      ).resolves.not.toThrow();
    });
  });

  describe('toModel', () => {
    it('should convert entity to model correctly', () => {
      const createdAt = new Date('2024-01-01T00:00:00.000Z');
      const updatedAt = new Date('2024-01-02T00:00:00.000Z');
      const entity = new TestEntity({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'John Doe',
        email: 'john.doe@example.com',
        createdAt,
        updatedAt,
      });

      const result = repository.toModel(entity);

      expect(result).toEqual({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'John Doe',
        email: 'john.doe@example.com',
        created_at: createdAt,
        updated_at: updatedAt,
      });
    });

    it('should handle entity with auto-generated values', () => {
      const entity = new TestEntity({
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
      });

      const result = repository.toModel(entity);

      expect(result.id).toBe(entity.id);
      expect(result.name).toBe('Jane Smith');
      expect(result.email).toBe('jane.smith@example.com');
      expect(result.created_at).toEqual(entity.createdAt);
      expect(result.updated_at).toEqual(entity.updatedAt);
    });
  });

  describe('toEntity', () => {
    it('should convert model to entity correctly', () => {
      const createdAt = new Date('2024-01-01T00:00:00.000Z');
      const updatedAt = new Date('2024-01-02T00:00:00.000Z');
      const model: TestModel = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'John Doe',
        email: 'john.doe@example.com',
        created_at: createdAt,
        updated_at: updatedAt,
      };

      const result = repository.toEntity(model);

      expect(result).toBeInstanceOf(TestEntity);
      expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john.doe@example.com');
      expect(result.createdAt).toEqual(createdAt);
      expect(result.updatedAt).toEqual(updatedAt);
    });

    it('should create valid entity instance with all properties', () => {
      const model: TestModel = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test User',
        email: 'test.user@example.com',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = repository.toEntity(model);

      expect(result).toBeInstanceOf(TestEntity);
      expect(result).toBeInstanceOf(BaseEntity);
      expect(typeof result.id).toBe('string');
      expect(typeof result.name).toBe('string');
      expect(typeof result.email).toBe('string');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('toCollection', () => {
    it('should convert array of models to array of entities', () => {
      const models: TestModel[] = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'User 1',
          email: 'user1@example.com',
          created_at: new Date('2024-01-01T00:00:00.000Z'),
          updated_at: new Date('2024-01-01T00:00:00.000Z'),
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'User 2',
          email: 'user2@example.com',
          created_at: new Date('2024-01-02T00:00:00.000Z'),
          updated_at: new Date('2024-01-02T00:00:00.000Z'),
        },
      ];

      const result = repository.toCollection(models);

      expect(result).toHaveLength(2);
      expect(result.every((entity) => entity instanceof TestEntity)).toBe(true);
      expect(result[0].name).toBe('User 1');
      expect(result[0].email).toBe('user1@example.com');
      expect(result[1].name).toBe('User 2');
      expect(result[1].email).toBe('user2@example.com');
    });

    it('should handle empty array', () => {
      const result = repository.toCollection([]);

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should maintain order of models in collection', () => {
      const models: TestModel[] = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Alpha',
          email: 'alpha@example.com',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'Beta',
          email: 'beta@example.com',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440003',
          name: 'Gamma',
          email: 'gamma@example.com',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const result = repository.toCollection(models);

      expect(result.map((entity) => entity.name)).toEqual([
        'Alpha',
        'Beta',
        'Gamma',
      ]);
    });
  });

  describe('database constraints and edge cases', () => {
    it('should handle unique constraint violations', async () => {
      const entity1 = new TestEntity({
        name: 'User 1',
        email: 'duplicate@example.com',
      });
      const entity2 = new TestEntity({
        name: 'User 2',
        email: 'duplicate@example.com',
      });

      await repository.create(entity1);

      await expect(repository.create(entity2)).rejects.toThrow();
    });

    it('should handle null values appropriately', async () => {
      const invalidModel: any = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: null,
        email: 'test@example.com',
        created_at: new Date(),
        updated_at: new Date(),
      };

      await expect(
        knexInstance('test_entities').insert(invalidModel),
      ).rejects.toThrow();
    });
  });
});
