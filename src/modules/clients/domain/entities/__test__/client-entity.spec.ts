import { ClientEntity } from '../client-entity';
import { AddressEntity } from '@/modules/addresses/domain/entities/address-entity';

describe('ClientEntity', () => {
  it('should create a client with required properties', () => {
    const client = new ClientEntity({
      name: 'João Silva',
      email: 'joao@email.com',
      phone: '11999999999',
    });
    expect(client.name).toBe('João Silva');
    expect(client.email).toBe('joao@email.com');
    expect(client.phone).toBe('11999999999');
    expect(client.id).toBeDefined();
    expect(client.createdAt).toBeInstanceOf(Date);
    expect(client.updatedAt).toBeInstanceOf(Date);
  });

  it('should accept addresses as an optional property', () => {
    const address1 = new AddressEntity({
      street: 'Rua A',
      city: 'Cidade B',
      state: 'Estado C',
      zipCode: '12345-678',
      country: 'Brasil',
      clientId: 'client-1',
    });
    const address2 = new AddressEntity({
      street: 'Rua X',
      city: 'Cidade Y',
      state: 'Estado Z',
      zipCode: '98765-432',
      country: 'Brasil',
      clientId: 'client-1',
    });
    const client = new ClientEntity({
      name: 'Maria Souza',
      email: 'maria@email.com',
      phone: '11888888888',
      addresses: [address1, address2],
    });
    expect(client.addresses).toHaveLength(2);
    expect(client.addresses?.[0]).toBe(address1);
    expect(client.addresses?.[1]).toBe(address2);
  });

  it('should allow custom id, createdAt, updatedAt', () => {
    const now = new Date('2023-01-01T00:00:00Z');
    const client = new ClientEntity({
      id: 'client-1',
      createdAt: now,
      updatedAt: now,
      name: 'Carlos Lima',
      email: 'carlos@email.com',
      phone: '11777777777',
    });
    expect(client.id).toBe('client-1');
    expect(client.createdAt).toBe(now);
    expect(client.updatedAt).toBe(now);
  });
});
