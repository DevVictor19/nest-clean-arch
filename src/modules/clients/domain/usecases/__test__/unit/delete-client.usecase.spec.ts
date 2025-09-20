/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { DeleteClientUseCase } from '../../delete-client-usecase';

describe('DeleteClientUseCase', () => {
  let clientRepository: any;
  let useCase: DeleteClientUseCase;
  const input = { clientId: 'client-id-1' };

  beforeEach(() => {
    clientRepository = {
      delete: jest.fn(),
    };
    useCase = new DeleteClientUseCase(clientRepository);
  });

  it('should call repository delete with correct clientId', async () => {
    clientRepository.delete.mockResolvedValue(undefined);
    await expect(useCase.execute(input)).resolves.toBeUndefined();
    expect(clientRepository.delete).toHaveBeenCalledWith(input.clientId);
  });
});
