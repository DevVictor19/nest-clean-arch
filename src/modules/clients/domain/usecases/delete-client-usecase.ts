import { BaseUseCase } from '@/core/domain/usecases/base-usecase';
import { Injectable } from '@nestjs/common';
import { ClientRepository } from '../repositories/client-repository';

interface Input {
  clientId: string;
}

type Output = void;

@Injectable()
export class DeleteClientUseCase implements BaseUseCase<Input, Output> {
  constructor(private readonly clientRepository: ClientRepository) {}

  async execute(input: Input): Promise<void> {
    await this.clientRepository.delete(input.clientId);
  }
}
