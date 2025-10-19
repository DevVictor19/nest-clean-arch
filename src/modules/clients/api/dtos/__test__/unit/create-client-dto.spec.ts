import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateClientDto } from '../../create-client-dto';

describe('CreateClientDto', () => {
  it('should validate a valid CreateClientDto', async () => {
    const dto = plainToInstance(CreateClientDto, {
      name: 'João Silva',
      email: 'joao@email.com',
      phone: '11999999999',
      addresses: [
        {
          street: 'Rua A',
          city: 'Cidade B',
          state: 'Estado C',
          zipCode: '12345-678',
          country: 'Brasil',
        },
      ],
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should validate a CreateClientDto with multiple addresses', async () => {
    const dto = plainToInstance(CreateClientDto, {
      name: 'Maria Souza',
      email: 'maria@email.com',
      phone: '11888888888',
      addresses: [
        {
          street: 'Rua A',
          city: 'Cidade B',
          state: 'Estado C',
          zipCode: '12345-678',
          country: 'Brasil',
        },
        {
          street: 'Rua X',
          city: 'Cidade Y',
          state: 'Estado Z',
          zipCode: '98765-432',
          country: 'Argentina',
          complement: 'Apto 101',
        },
      ],
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should validate address with optional complement', async () => {
    const dto = plainToInstance(CreateClientDto, {
      name: 'Carlos Lima',
      email: 'carlos@email.com',
      phone: '11777777777',
      addresses: [
        {
          street: 'Rua Principal',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234-567',
          country: 'Brasil',
          complement: 'Casa 10',
        },
      ],
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation when name is missing', async () => {
    const dto = plainToInstance(CreateClientDto, {
      email: 'joao@email.com',
      phone: '11999999999',
      addresses: [
        {
          street: 'Rua A',
          city: 'Cidade B',
          state: 'Estado C',
          zipCode: '12345-678',
          country: 'Brasil',
        },
      ],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });

  it('should fail validation when email is missing', async () => {
    const dto = plainToInstance(CreateClientDto, {
      name: 'João Silva',
      phone: '11999999999',
      addresses: [
        {
          street: 'Rua A',
          city: 'Cidade B',
          state: 'Estado C',
          zipCode: '12345-678',
          country: 'Brasil',
        },
      ],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('email');
  });

  it('should fail validation when email is invalid', async () => {
    const dto = plainToInstance(CreateClientDto, {
      name: 'João Silva',
      email: 'invalid-email',
      phone: '11999999999',
      addresses: [
        {
          street: 'Rua A',
          city: 'Cidade B',
          state: 'Estado C',
          zipCode: '12345-678',
          country: 'Brasil',
        },
      ],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('email');
  });

  it('should fail validation when phone is missing', async () => {
    const dto = plainToInstance(CreateClientDto, {
      name: 'João Silva',
      email: 'joao@email.com',
      addresses: [
        {
          street: 'Rua A',
          city: 'Cidade B',
          state: 'Estado C',
          zipCode: '12345-678',
          country: 'Brasil',
        },
      ],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('phone');
  });

  it('should fail validation when addresses is missing', async () => {
    const dto = plainToInstance(CreateClientDto, {
      name: 'João Silva',
      email: 'joao@email.com',
      phone: '11999999999',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('addresses');
  });

  it('should fail validation when addresses is not an array', async () => {
    const dto = plainToInstance(CreateClientDto, {
      name: 'João Silva',
      email: 'joao@email.com',
      phone: '11999999999',
      addresses: 'not-an-array',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('addresses');
  });

  it('should fail validation when address street is missing', async () => {
    const dto = plainToInstance(CreateClientDto, {
      name: 'João Silva',
      email: 'joao@email.com',
      phone: '11999999999',
      addresses: [
        {
          city: 'Cidade B',
          state: 'Estado C',
          zipCode: '12345-678',
          country: 'Brasil',
        },
      ],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('addresses');
  });

  it('should fail validation when address city is missing', async () => {
    const dto = plainToInstance(CreateClientDto, {
      name: 'João Silva',
      email: 'joao@email.com',
      phone: '11999999999',
      addresses: [
        {
          street: 'Rua A',
          state: 'Estado C',
          zipCode: '12345-678',
          country: 'Brasil',
        },
      ],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('addresses');
  });

  it('should fail validation when address state is missing', async () => {
    const dto = plainToInstance(CreateClientDto, {
      name: 'João Silva',
      email: 'joao@email.com',
      phone: '11999999999',
      addresses: [
        {
          street: 'Rua A',
          city: 'Cidade B',
          zipCode: '12345-678',
          country: 'Brasil',
        },
      ],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('addresses');
  });

  it('should fail validation when address zipCode is missing', async () => {
    const dto = plainToInstance(CreateClientDto, {
      name: 'João Silva',
      email: 'joao@email.com',
      phone: '11999999999',
      addresses: [
        {
          street: 'Rua A',
          city: 'Cidade B',
          state: 'Estado C',
          country: 'Brasil',
        },
      ],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('addresses');
  });

  it('should fail validation when address country is missing', async () => {
    const dto = plainToInstance(CreateClientDto, {
      name: 'João Silva',
      email: 'joao@email.com',
      phone: '11999999999',
      addresses: [
        {
          street: 'Rua A',
          city: 'Cidade B',
          state: 'Estado C',
          zipCode: '12345-678',
        },
      ],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('addresses');
  });

  it('should fail validation when multiple fields are invalid', async () => {
    const dto = plainToInstance(CreateClientDto, {
      email: 'invalid-email',
      addresses: 'not-an-array',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(1);
  });

  it('should fail validation when name is not a string', async () => {
    const dto = plainToInstance(CreateClientDto, {
      name: 12345,
      email: 'joao@email.com',
      phone: '11999999999',
      addresses: [
        {
          street: 'Rua A',
          city: 'Cidade B',
          state: 'Estado C',
          zipCode: '12345-678',
          country: 'Brasil',
        },
      ],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });

  it('should fail validation when phone is not a string', async () => {
    const dto = plainToInstance(CreateClientDto, {
      name: 'João Silva',
      email: 'joao@email.com',
      phone: 11999999999,
      addresses: [
        {
          street: 'Rua A',
          city: 'Cidade B',
          state: 'Estado C',
          zipCode: '12345-678',
          country: 'Brasil',
        },
      ],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('phone');
  });
});
