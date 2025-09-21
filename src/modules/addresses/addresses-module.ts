import { Module } from '@nestjs/common';
import { AddressRepository } from './domain/repositories';
import { AddressPostgresRepository } from './infra/repositories';

@Module({
  providers: [
    {
      provide: AddressRepository,
      useClass: AddressPostgresRepository,
    },
  ],
  exports: [AddressRepository],
})
export class AddressesModule {}
