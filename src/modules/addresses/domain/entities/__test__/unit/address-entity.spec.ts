import { ClientEntity } from '@/modules/clients/domain/entities';
import { AddressEntity } from '../../address-entity';

describe('AddressEntity', () => {
  it('should create an address with required properties', () => {
    const address = new AddressEntity({
      street: 'Rua A',
      city: 'Cidade B',
      state: 'Estado C',
      zipCode: '12345-678',
      country: 'Brasil',
      clientId: 'client-1',
    });
    expect(address.street).toBe('Rua A');
    expect(address.city).toBe('Cidade B');
    expect(address.state).toBe('Estado C');
    expect(address.zipCode).toBe('12345-678');
    expect(address.country).toBe('Brasil');
    expect(address.clientId).toBe('client-1');
    expect(address.id).toBeDefined();
    expect(address.createdAt).toBeInstanceOf(Date);
    expect(address.updatedAt).toBeInstanceOf(Date);
  });

  it('should accept complement and client as optional properties', () => {
    const client = new ClientEntity({
      id: 'client-2',
      name: 'Cliente X',
      email: 'cliente.x@email.com',
      phone: '123456789',
    });
    const address = new AddressEntity({
      street: 'Rua B',
      city: 'Cidade Y',
      state: 'Estado Z',
      zipCode: '98765-432',
      country: 'Brasil',
      clientId: 'client-2',
      complement: 'Apto 101',
      client,
    });
    expect(address.complement).toBe('Apto 101');
    expect(address.client).toBe(client);
  });

  it('should allow custom id, createdAt, updatedAt', () => {
    const now = new Date('2023-01-01T00:00:00Z');
    const address = new AddressEntity({
      id: 'address-1',
      createdAt: now,
      updatedAt: now,
      street: 'Rua C',
      city: 'Cidade W',
      state: 'Estado V',
      zipCode: '11111-222',
      country: 'Brasil',
      clientId: 'client-3',
    });
    expect(address.id).toBe('address-1');
    expect(address.createdAt).toBe(now);
    expect(address.updatedAt).toBe(now);
  });
});
