import { Module } from '@nestjs/common';
import { ClientsController } from './api/controllers';
import {
  CreateClientUseCase,
  DeleteClientUseCase,
  FindByIdClientUseCase,
  FindPaginatedClientsUseCase,
  UpdateClientUseCase,
} from './domain/usecases';
import { ClientRepository } from './domain/repositories';
import { ClientPostgresRepository } from './infra/repositories';
import { AddressesModule } from '../addresses/addresses-module';

@Module({
  controllers: [ClientsController],
  providers: [
    {
      provide: ClientRepository,
      useClass: ClientPostgresRepository,
    },
    CreateClientUseCase,
    DeleteClientUseCase,
    FindByIdClientUseCase,
    FindPaginatedClientsUseCase,
    UpdateClientUseCase,
  ],
  imports: [AddressesModule],
})
export class ClientsModule {}
