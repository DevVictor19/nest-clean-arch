import { Module } from '@nestjs/common';
import { AddressRepository } from './domain/repositories';
import { AddressPostgresRepository } from './infra/repositories';
import { AddressService } from './domain/services';
import { AddressServiceImpl } from './infra/services';

@Module({
  providers: [
    {
      provide: AddressRepository,
      useClass: AddressPostgresRepository,
    },
    {
      provide: AddressService,
      useClass: AddressServiceImpl,
    },
  ],
  exports: [AddressService],
})
export class AddressesModule {}
