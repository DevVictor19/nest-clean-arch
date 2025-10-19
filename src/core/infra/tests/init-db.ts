import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import knex, { Knex } from 'knex';

export async function initDatabaseContainer() {
  const container = await new PostgreSqlContainer('postgres:17.6-alpine')
    .withDatabase('test_db')
    .withUsername('test_user')
    .withPassword('test_password')
    .start();

  const knexInstance = knex({
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

  await knexInstance.schema.createTable('addresses', (table) => {
    table.uuid('id').primary();
    table.string('street').notNullable();
    table.string('city').notNullable();
    table.string('state').notNullable();
    table.string('zip_code').notNullable();
    table.string('country').notNullable();
    table.string('complement');
    table
      .uuid('client_id')
      .notNullable()
      .references('id')
      .inTable('clients')
      .onDelete('CASCADE');
    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knexInstance.fn.now());
    table
      .timestamp('updated_at')
      .notNullable()
      .defaultTo(knexInstance.fn.now());
  });

  return { container, knexInstance };
}

export async function cleanupDatabaseContainer(
  container: StartedPostgreSqlContainer,
  instance: Knex,
) {
  if (instance) {
    await instance.destroy();
  }
  if (container) {
    await container.stop();
  }
}

export async function cleanupTables(knexInstance: Knex) {
  await knexInstance('addresses').del();
  await knexInstance('clients').del();
}
