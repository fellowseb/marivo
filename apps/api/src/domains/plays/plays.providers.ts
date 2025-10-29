import type { Provider } from '../../shared/provider.ts';
import { UserContextService } from '../../shared/use-case.ts';
import CreatePlayUseCase from './create-play.use-case.ts';
import { GetAllPlaysUseCase } from './get-all-plays.use-case.ts';
import { RespondToInviteUseCase } from './respond-to-invite.use-case.ts';
import { UserInvitesRepository } from './user-invites.repository.ts';
import { UserPlaysRepository } from './user-plays.repository.ts';
import { PlayDetailsUseCase } from './play-details.use-case.ts';

import type { Request } from 'express';
import { Result } from '@marivo/utils';
import { AppError } from '../../shared/error.ts';

export abstract class ResourceAccessAuth<TInput> {
  abstract authorize(params: {
    ctx: { request: Request };
    input: TInput;
  }): Promise<Result<undefined, AppError>>;
}

class PlayAccessForbidden extends AppError {
  constructor() {
    super('Forbidden play access', 'FORBIDDEN');
  }
}

class PlayAccessChecker extends ResourceAccessAuth<{
  uri: string;
}> {
  constructor(playRepository: UserPlaysRepository) {
    super();
    this.playRepository = playRepository;
  }

  async authorize(params: {
    input: { uri: string };
  }): Promise<Result<undefined, PlayAccessForbidden>> {
    return await this.playRepository.checkPlayAccess({
      uri: params.input.uri,
    });
  }

  private playRepository: UserPlaysRepository;
}

export const providers = {
  GetAllPlaysUseCase: {
    instantiate({ req, sql }) {
      const userContextService = new UserContextService(req);
      const playsRepository = new UserPlaysRepository(sql, userContextService);
      const invitesRepository = new UserInvitesRepository(
        sql,
        userContextService,
      );
      return new GetAllPlaysUseCase(
        playsRepository,
        invitesRepository,
        userContextService,
      );
    },
  } as Provider<GetAllPlaysUseCase>,
  RespondToInviteUseCase: {
    instantiate({ req, sql }) {
      const userContextService = new UserContextService(req);
      const playsRepository = new UserPlaysRepository(sql, userContextService);
      const invitesRepository = new UserInvitesRepository(
        sql,
        userContextService,
      );
      return new RespondToInviteUseCase(
        userContextService,
        playsRepository,
        invitesRepository,
      );
    },
  } as Provider<RespondToInviteUseCase>,
  CreatePlayUseCase: {
    instantiate({ req, sql }) {
      const userContextService = new UserContextService(req);
      const playsRepository = new UserPlaysRepository(sql, userContextService);
      return new CreatePlayUseCase(playsRepository, userContextService);
    },
  } as Provider<CreatePlayUseCase>,
  PlayDetailsUseCase: {
    instantiate({ req, sql }) {
      const userContextService = new UserContextService(req);
      const playsRepository = new UserPlaysRepository(sql, userContextService);
      return new PlayDetailsUseCase(playsRepository, userContextService);
    },
  } as Provider<PlayDetailsUseCase>,
  PlayAccessChecker: {
    instantiate({ req, sql }) {
      const userContextService = new UserContextService(req);
      const playsRepository = new UserPlaysRepository(sql, userContextService);
      return new PlayAccessChecker(playsRepository);
    },
  } as Provider<PlayAccessChecker>,
};
