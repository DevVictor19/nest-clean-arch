import { Module } from '@nestjs/common';
import { ClientsModule } from './clients/clients-module';
import { AddressesModule } from './addresses/addresses-module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@/core/infra/database/database-module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    ClientsModule,
    AddressesModule,
  ],
})
export class AppModule {}
