import { BasePaginatedRepository } from '@/core/domain/repositories';
import { ClientEntity } from '../entities';

export abstract class ClientRepository extends BasePaginatedRepository<ClientEntity> {
  abstract findByEmail(email: string): Promise<ClientEntity | null>;
  abstract findByPhone(phone: string): Promise<ClientEntity | null>;
}
