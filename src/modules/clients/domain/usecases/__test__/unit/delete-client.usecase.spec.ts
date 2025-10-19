import { DeleteClientUseCase } from '../../delete-client-usecase';
import { ClientRepository } from '../../../repositories';
import { Test } from '@nestjs/testing';

describe('DeleteClientUseCase', () => {
  let clientRepository: ClientRepository;
  let useCase: DeleteClientUseCase;

  const input = { clientId: 'client-id-1' };

  beforeEach(async () => {
    const clientRepositoryMock = {
      delete: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DeleteClientUseCase,
        {
          provide: ClientRepository,
          useValue: clientRepositoryMock,
        },
      ],
    }).compile();

    clientRepository = moduleRef.get(ClientRepository);
    useCase = moduleRef.get(DeleteClientUseCase);
  });

  it('should call repository delete with correct clientId', async () => {
    jest.spyOn(clientRepository, 'delete').mockResolvedValue(undefined);

    await expect(useCase.execute(input)).resolves.toBeUndefined();

    expect(clientRepository.delete).toHaveBeenCalledWith(input.clientId);
  });
});
