import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateClientDto } from '../../update-client-dto';

describe('UpdateClientDto', () => {
  it('should validate a valid UpdateClientDto with all fields', async () => {
    const dto = plainToInstance(UpdateClientDto, {
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

  it('should validate an UpdateClientDto with only name', async () => {
    const dto = plainToInstance(UpdateClientDto, {
      name: 'Maria Souza',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should validate an UpdateClientDto with only email', async () => {
    const dto = plainToInstance(UpdateClientDto, {
      email: 'maria@email.com',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should validate an UpdateClientDto with only phone', async () => {
    const dto = plainToInstance(UpdateClientDto, {
      phone: '11888888888',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should validate an UpdateClientDto with only addresses', async () => {
    const dto = plainToInstance(UpdateClientDto, {
      addresses: [
        {
          street: 'Rua X',
          city: 'Cidade Y',
          state: 'Estado Z',
          zipCode: '98765-432',
          country: 'Argentina',
        },
      ],
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should validate an UpdateClientDto with multiple addresses', async () => {
    const dto = plainToInstance(UpdateClientDto, {
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
    const dto = plainToInstance(UpdateClientDto, {
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

  it('should validate an empty UpdateClientDto', async () => {
    const dto = plainToInstance(UpdateClientDto, {});

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should validate an UpdateClientDto with name and email', async () => {
    const dto = plainToInstance(UpdateClientDto, {
      name: 'Carlos Lima',
      email: 'carlos@email.com',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should validate an UpdateClientDto with email and phone', async () => {
    const dto = plainToInstance(UpdateClientDto, {
      email: 'pedro@email.com',
      phone: '11777777777',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation when email is invalid', async () => {
    const dto = plainToInstance(UpdateClientDto, {
      email: 'invalid-email',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('email');
  });

  it('should fail validation when name is not a string', async () => {
    const dto = plainToInstance(UpdateClientDto, {
      name: 12345,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });

  it('should fail validation when phone is not a string', async () => {
    const dto = plainToInstance(UpdateClientDto, {
      phone: 11999999999,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('phone');
  });

  it('should fail validation when addresses is not an array', async () => {
    const dto = plainToInstance(UpdateClientDto, {
      addresses: 'not-an-array',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('addresses');
  });

  it('should fail validation when address street is missing', async () => {
    const dto = plainToInstance(UpdateClientDto, {
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
    const dto = plainToInstance(UpdateClientDto, {
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
    const dto = plainToInstance(UpdateClientDto, {
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
    const dto = plainToInstance(UpdateClientDto, {
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
    const dto = plainToInstance(UpdateClientDto, {
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
    const dto = plainToInstance(UpdateClientDto, {
      name: 12345,
      email: 'invalid-email',
      phone: 11999999999,
      addresses: 'not-an-array',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(1);
  });

  it('should fail validation when address street is not a string', async () => {
    const dto = plainToInstance(UpdateClientDto, {
      addresses: [
        {
          street: 12345,
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

  it('should fail validation when address city is not a string', async () => {
    const dto = plainToInstance(UpdateClientDto, {
      addresses: [
        {
          street: 'Rua A',
          city: 12345,
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

  it('should fail validation when address state is not a string', async () => {
    const dto = plainToInstance(UpdateClientDto, {
      addresses: [
        {
          street: 'Rua A',
          city: 'Cidade B',
          state: 12345,
          zipCode: '12345-678',
          country: 'Brasil',
        },
      ],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('addresses');
  });

  it('should fail validation when address zipCode is not a string', async () => {
    const dto = plainToInstance(UpdateClientDto, {
      addresses: [
        {
          street: 'Rua A',
          city: 'Cidade B',
          state: 'Estado C',
          zipCode: 12345678,
          country: 'Brasil',
        },
      ],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('addresses');
  });

  it('should fail validation when address country is not a string', async () => {
    const dto = plainToInstance(UpdateClientDto, {
      addresses: [
        {
          street: 'Rua A',
          city: 'Cidade B',
          state: 'Estado C',
          zipCode: '12345-678',
          country: 12345,
        },
      ],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('addresses');
  });

  it('should fail validation when address complement is not a string', async () => {
    const dto = plainToInstance(UpdateClientDto, {
      addresses: [
        {
          street: 'Rua A',
          city: 'Cidade B',
          state: 'Estado C',
          zipCode: '12345-678',
          country: 'Brasil',
          complement: 12345,
        },
      ],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('addresses');
  });
});
