import type { Provider } from '../../shared/provider.ts';
import { UserContextService } from '../../shared/use-case.ts';
import { GetAllPlaysUseCase } from './get-all-plays.use-case.ts';
import { PlaysRepository } from './plays.repository.ts';

const repository = new PlaysRepository();

export const providers = {
  GetAllPlaysUseCase: {
    instantiate(req) {
      const userContextService = new UserContextService(req);
      return new GetAllPlaysUseCase(repository, userContextService);
    },
  } as Provider<GetAllPlaysUseCase>,
};
