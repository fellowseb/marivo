import type { Provider } from '../../shared/provider.ts';
import { UserContextService } from '../../shared/use-case.ts';
import { GetAllPlaysUseCase } from './get-all-plays.use-case.ts';
import { InvitesRepository } from './invites.repository.ts';
import { PlaysRepository } from './plays.repository.ts';

const playsRepository = new PlaysRepository();
const invitesRepository = new InvitesRepository();

export const providers = {
  GetAllPlaysUseCase: {
    instantiate(req) {
      const userContextService = new UserContextService(req);
      return new GetAllPlaysUseCase(
        playsRepository,
        invitesRepository,
        userContextService,
      );
    },
  } as Provider<GetAllPlaysUseCase>,
};
