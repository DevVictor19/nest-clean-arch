import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { knex, Knex } from 'knex';

export const Connection = 'DATABASE_CONNECTION';
export type ConnectionManager = Knex;

@Global()
@Module({
  providers: [
    {
      provide: Connection,
      useFactory: async (configService: ConfigService) => {
        const db = knex({
          client: 'pg',
          connection: {
            host: configService.getOrThrow<string>('DB_HOST'),
            port: configService.getOrThrow<number>('DB_PORT'),
            user: configService.getOrThrow<string>('DB_USER'),
            database: configService.getOrThrow<string>('DB_NAME'),
            password: configService.getOrThrow<string>('DB_PASSWORD'),
            ssl:
              configService.getOrThrow<string>('DB_SSL') === 'true'
                ? { rejectUnauthorized: false }
                : false,
          },
          pool: {
            min: 0,
            max: 10,
          },
        });
        const logger = new Logger('DatabaseModule');
        try {
          logger.log('Connecting to the database...');
          await db.raw('SELECT version()');
        } catch (error) {
          logger.error('Error connecting to the database');
          throw error;
        }
        return db;
      },
      inject: [ConfigService],
    },
  ],
  exports: [Connection],
})
export class DatabaseModule {}
