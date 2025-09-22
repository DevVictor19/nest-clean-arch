import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { knex, Knex } from 'knex';
import { BasePostgresPaginatedRepository } from '../../base-postgres-paginated-repository';
import {
  BaseEntity,
  BaseEntityProps,
} from '@/core/domain/entities/base-entity';
import { BaseModel } from '../../../models/base-model';
import {
  FilterOperator,
  FindPaginatedParams,
} from '@/core/domain/repositories/base-paginated-repository';

type TestPaginatedEntityProps = BaseEntityProps & {
  name: string;
  email: string;
  age: number;
  score: number;
  status: string;
};

class TestPaginatedEntity extends BaseEntity {
  name: string;
  email: string;
  age: number;
  score: number;
  status: string;

  constructor(props: TestPaginatedEntityProps) {
    const { id, createdAt, updatedAt, ...rest } = props;
    super({ id, createdAt, updatedAt });
    Object.assign(this, rest);
  }
}

interface TestPaginatedModel extends BaseModel {
  name: string;
  email: string;
  age: number;
  score: number;
  status: string;
}

class TestPostgresPaginatedRepository extends BasePostgresPaginatedRepository<
  TestPaginatedEntity,
  TestPaginatedModel
> {
  constructor(manager: Knex) {
    super(manager, 'test_paginated_entities');
  }

  toModel(entity: TestPaginatedEntity): TestPaginatedModel {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      age: entity.age,
      score: entity.score,
      status: entity.status,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    };
  }

  toEntity(model: TestPaginatedModel): TestPaginatedEntity {
    return new TestPaginatedEntity({
      id: model.id,
      name: model.name,
      email: model.email,
      age: model.age,
      score: model.score,
      status: model.status,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
    });
  }

  toCollection(models: TestPaginatedModel[]): TestPaginatedEntity[] {
    return models.map((model) => this.toEntity(model));
  }
}

describe('BasePostgresPaginatedRepository Integration Tests', () => {
  let container: StartedPostgreSqlContainer;
  let knexInstance: Knex;
  let repository: TestPostgresPaginatedRepository;

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

    await knexInstance.schema.createTable(
      'test_paginated_entities',
      (table) => {
        table.uuid('id').primary();
        table.string('name').notNullable();
        table.string('email').unique().notNullable();
        table.integer('age').notNullable();
        table.decimal('score', 5, 2).notNullable();
        table.string('status').notNullable();
        table
          .timestamp('created_at')
          .notNullable()
          .defaultTo(knexInstance.fn.now());
        table
          .timestamp('updated_at')
          .notNullable()
          .defaultTo(knexInstance.fn.now());
      },
    );

    repository = new TestPostgresPaginatedRepository(knexInstance);
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
    await knexInstance('test_paginated_entities').del();
  });

  const createTestEntities = async () => {
    const entities = [
      new TestPaginatedEntity({
        name: 'Alice Johnson',
        email: 'alice@example.com',
        age: 25,
        score: 85.5,
        status: 'active',
      }),
      new TestPaginatedEntity({
        name: 'Bob Smith',
        email: 'bob@example.com',
        age: 30,
        score: 92.0,
        status: 'active',
      }),
      new TestPaginatedEntity({
        name: 'Charlie Brown',
        email: 'charlie@example.com',
        age: 35,
        score: 78.5,
        status: 'inactive',
      }),
      new TestPaginatedEntity({
        name: 'Diana Prince',
        email: 'diana@example.com',
        age: 28,
        score: 95.5,
        status: 'active',
      }),
      new TestPaginatedEntity({
        name: 'Edward Norton',
        email: 'edward@example.com',
        age: 40,
        score: 88.5,
        status: 'inactive',
      }),
      new TestPaginatedEntity({
        name: 'Fiona Green',
        email: 'fiona@example.com',
        age: 22,
        score: 91.0,
        status: 'active',
      }),
      new TestPaginatedEntity({
        name: 'George Wilson',
        email: 'george@example.com',
        age: 45,
        score: 82.0,
        status: 'active',
      }),
      new TestPaginatedEntity({
        name: 'Helen Davis',
        email: 'helen@example.com',
        age: 32,
        score: 89.5,
        status: 'inactive',
      }),
    ];

    await repository.createMany(entities);
    return entities;
  };

  describe('findPaginated - Basic Pagination', () => {
    it('should return paginated results with default parameters', async () => {
      await createTestEntities();

      const result = await repository.findPaginated();

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(8);
      expect(result.data).toHaveLength(8);
      expect(
        result.data.every((entity) => entity instanceof TestPaginatedEntity),
      ).toBe(true);
    });

    it('should return first page with custom limit', async () => {
      await createTestEntities();

      const params: FindPaginatedParams = {
        page: 1,
        limit: 3,
      };

      const result = await repository.findPaginated(params);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(3);
      expect(result.total).toBe(8);
      expect(result.data).toHaveLength(3);
    });

    it('should return second page with custom limit', async () => {
      await createTestEntities();

      const params: FindPaginatedParams = {
        page: 2,
        limit: 3,
      };

      const result = await repository.findPaginated(params);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(3);
      expect(result.total).toBe(8);
      expect(result.data).toHaveLength(3);
    });

    it('should return empty results for page beyond available data', async () => {
      await createTestEntities();

      const params: FindPaginatedParams = {
        page: 10,
        limit: 3,
      };

      const result = await repository.findPaginated(params);

      expect(result.page).toBe(10);
      expect(result.limit).toBe(3);
      expect(result.total).toBe(8);
      expect(result.data).toHaveLength(0);
    });

    it('should handle empty table', async () => {
      const result = await repository.findPaginated();

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(0);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('findPaginated - Sorting', () => {
    it('should sort by name ascending', async () => {
      await createTestEntities();

      const params: FindPaginatedParams = {
        sort: {
          sortBy: 'name',
          sortOrder: 'asc',
        },
      };

      const result = await repository.findPaginated(params);

      expect(result.data).toHaveLength(8);
      expect(result.data[0].name).toBe('Alice Johnson');
      expect(result.data[1].name).toBe('Bob Smith');
      expect(result.data[2].name).toBe('Charlie Brown');
    });

    it('should sort by age descending', async () => {
      await createTestEntities();

      const params: FindPaginatedParams = {
        sort: {
          sortBy: 'age',
          sortOrder: 'desc',
        },
      };

      const result = await repository.findPaginated(params);

      expect(result.data).toHaveLength(8);
      expect(result.data[0].age).toBe(45);
      expect(result.data[1].age).toBe(40);
      expect(result.data[2].age).toBe(35);
    });

    it('should sort by score descending', async () => {
      await createTestEntities();

      const params: FindPaginatedParams = {
        sort: {
          sortBy: 'score',
          sortOrder: 'desc',
        },
      };

      const result = await repository.findPaginated(params);

      expect(result.data).toHaveLength(8);
      expect(result.data[0].name).toBe('Diana Prince');
      expect(result.data[1].name).toBe('Bob Smith');
      expect(result.data[2].name).toBe('Fiona Green');
    });

    it('should default to ascending order when sortOrder not specified', async () => {
      await createTestEntities();

      const params: FindPaginatedParams = {
        sort: {
          sortBy: 'age',
        },
      };

      const result = await repository.findPaginated(params);

      expect(result.data).toHaveLength(8);
      expect(result.data[0].age).toBe(22);
      expect(result.data[1].age).toBe(25);
    });
  });

  describe('findPaginated - Filters', () => {
    it('should filter by status using EQ operator', async () => {
      await createTestEntities();

      const params: FindPaginatedParams = {
        filters: [
          {
            field: 'status',
            operator: FilterOperator.EQ,
            value: 'active',
          },
        ],
      };

      const result = await repository.findPaginated(params);

      expect(result.total).toBe(5);
      expect(result.data).toHaveLength(5);
      expect(result.data.every((entity) => entity.status === 'active')).toBe(
        true,
      );
    });

    it('should filter by age using GT operator', async () => {
      await createTestEntities();

      const params: FindPaginatedParams = {
        filters: [
          {
            field: 'age',
            operator: FilterOperator.GT,
            value: 30,
          },
        ],
      };

      const result = await repository.findPaginated(params);

      expect(result.total).toBe(4);
      expect(result.data).toHaveLength(4);
      expect(result.data.every((entity) => entity.age > 30)).toBe(true);
    });

    it('should filter by score using LTE operator', async () => {
      await createTestEntities();

      const params: FindPaginatedParams = {
        filters: [
          {
            field: 'score',
            operator: FilterOperator.LTE,
            value: 88.5,
          },
        ],
      };

      const result = await repository.findPaginated(params);

      expect(result.total).toBe(4);
      expect(result.data).toHaveLength(4);
      expect(result.data.every((entity) => entity.score <= 88.5)).toBe(true);
    });

    it('should filter by name using LIKE operator', async () => {
      await createTestEntities();

      const params: FindPaginatedParams = {
        filters: [
          {
            field: 'name',
            operator: FilterOperator.LIKE,
            value: 'Brown',
          },
        ],
      };

      const result = await repository.findPaginated(params);

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Charlie Brown');
    });

    it('should filter using multiple filters (AND logic)', async () => {
      await createTestEntities();

      const params: FindPaginatedParams = {
        filters: [
          {
            field: 'status',
            operator: FilterOperator.EQ,
            value: 'active',
          },
          {
            field: 'age',
            operator: FilterOperator.GTE,
            value: 25,
          },
        ],
      };

      const result = await repository.findPaginated(params);

      expect(result.total).toBe(4);
      expect(result.data).toHaveLength(4);
      expect(
        result.data.every(
          (entity) => entity.status === 'active' && entity.age >= 25,
        ),
      ).toBe(true);
    });
  });

  describe('findPaginated - Combined Features', () => {
    it('should combine pagination, sorting, and filtering', async () => {
      await createTestEntities();

      const params: FindPaginatedParams = {
        page: 1,
        limit: 2,
        sort: {
          sortBy: 'score',
          sortOrder: 'desc',
        },
        filters: [
          {
            field: 'status',
            operator: FilterOperator.EQ,
            value: 'active',
          },
        ],
      };

      const result = await repository.findPaginated(params);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.total).toBe(5);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Diana Prince');
      expect(result.data[1].name).toBe('Bob Smith');
    });

    it('should handle complex filtering with sorting and pagination', async () => {
      await createTestEntities();

      const params: FindPaginatedParams = {
        page: 2,
        limit: 2,
        sort: {
          sortBy: 'age',
          sortOrder: 'asc',
        },
        filters: [
          {
            field: 'score',
            operator: FilterOperator.GT,
            value: 80,
          },
        ],
      };

      const result = await repository.findPaginated(params);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(2);
      expect(result.total).toBe(7);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('findPaginated - Edge Cases', () => {
    it('should default to page 1 when an invalid (zero or negative) page number is provided', async () => {
      await createTestEntities();

      const params: FindPaginatedParams = {
        page: 0,
        limit: 5,
      };

      const result = await repository.findPaginated(params);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(5);
    });

    it('should handle large limits', async () => {
      await createTestEntities();

      const params: FindPaginatedParams = {
        page: 1,
        limit: 100,
      };

      const result = await repository.findPaginated(params);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(100);
      expect(result.total).toBe(8);
      expect(result.data).toHaveLength(8);
    });

    it('should restrict limit to a maximum of 100 and fallback to default when exceeded', async () => {
      await createTestEntities();

      const params: FindPaginatedParams = {
        page: 1,
        limit: 101,
      };

      const result = await repository.findPaginated(params);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(8);
      expect(result.data).toHaveLength(8);
    });

    it('should handle non-existent sort field gracefully', async () => {
      await createTestEntities();

      const params: FindPaginatedParams = {
        sort: {
          sortBy: 'nonexistent_field',
          sortOrder: 'asc',
        },
      };

      await expect(repository.findPaginated(params)).rejects.toThrow();
    });

    it('should handle filter on non-existent field gracefully', async () => {
      await createTestEntities();

      const params: FindPaginatedParams = {
        filters: [
          {
            field: 'nonexistent_field',
            operator: FilterOperator.EQ,
            value: 'some_value',
          },
        ],
      };

      await expect(repository.findPaginated(params)).rejects.toThrow();
    });
  });

  describe('findPaginated - Advanced Filtering', () => {
    it('should filter using multiple status values separately', async () => {
      await createTestEntities();

      const activeParams: FindPaginatedParams = {
        filters: [
          {
            field: 'status',
            operator: FilterOperator.EQ,
            value: 'active',
          },
        ],
      };

      const activeResult = await repository.findPaginated(activeParams);
      expect(activeResult.total).toBe(5);

      const inactiveParams: FindPaginatedParams = {
        filters: [
          {
            field: 'status',
            operator: FilterOperator.EQ,
            value: 'inactive',
          },
        ],
      };

      const inactiveResult = await repository.findPaginated(inactiveParams);
      expect(inactiveResult.total).toBe(3);
    });

    it('should handle complex age range filtering', async () => {
      await createTestEntities();

      const minAgeParams: FindPaginatedParams = {
        filters: [
          {
            field: 'age',
            operator: FilterOperator.GTE,
            value: 25,
          },
        ],
      };

      const minAgeResult = await repository.findPaginated(minAgeParams);
      expect(minAgeResult.total).toBe(7);
      expect(minAgeResult.data.every((entity) => entity.age >= 25)).toBe(true);

      const maxAgeParams: FindPaginatedParams = {
        filters: [
          {
            field: 'age',
            operator: FilterOperator.LTE,
            value: 35,
          },
        ],
      };

      const maxAgeResult = await repository.findPaginated(maxAgeParams);
      expect(maxAgeResult.total).toBe(6);
      expect(maxAgeResult.data.every((entity) => entity.age <= 35)).toBe(true);
    });
  });
});
