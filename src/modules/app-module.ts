import { Module } from '@nestjs/common';
import { ClientsModule } from './clients/clients-module';
import { AddressesModule } from './addresses/addresses-module';

@Module({
  imports: [ClientsModule, AddressesModule],
})
export class AppModule {}
