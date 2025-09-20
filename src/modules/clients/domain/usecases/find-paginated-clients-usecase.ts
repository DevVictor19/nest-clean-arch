import {
  FindPaginatedParams,
  PaginatedResult,
} from '@/core/domain/repositories/base-paginated-repository';
import { BaseUseCase } from '@/core/domain/usecases/base-usecase';
import { Injectable } from '@nestjs/common';
import { ClientEntity } from '../entities/client-entity';
import { ClientRepository } from '../repositories/client-repository';

type Input = FindPaginatedParams;

type Output = PaginatedResult<ClientEntity>;

@Injectable()
export class FindPaginatedClientsUseCase implements BaseUseCase<Input, Output> {
  constructor(private readonly clientRepository: ClientRepository) {}

  async execute(input: FindPaginatedParams): Promise<Output> {
    return this.clientRepository.findPaginated(input);
  }
}
