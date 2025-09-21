import type { Knex } from 'knex';

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'postgresql',
    connection: {
      database: 'myapp',
      user: 'postgres',
      password: 'password',
      host: 'localhost',
      port: 5432,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      extension: 'ts',
      directory: './src/core/infra/database/migrations',
    },
  },
};

module.exports = config;
