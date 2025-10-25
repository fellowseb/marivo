import z from 'zod';
import { Result } from '@marivo/utils';
import {
  AuthenticatedUseCase,
  UserContextService,
} from '../../shared/use-case.ts';
import type { UserInvitesRepository } from './user-invites.repository.ts';
import type { UserPlaysRepository } from './user-plays.repository.ts';

export const RespondToInviteUseCaseInputSchema = z.object({
  inviteUri: z.string(),
  accept: z.boolean(),
});

type RespondToInviteUseCaseInput = z.infer<
  typeof RespondToInviteUseCaseInputSchema
>;

export class RespondToInviteUseCase extends AuthenticatedUseCase<{
  params: RespondToInviteUseCaseInput;
}> {
  constructor(
    userContext: UserContextService,
    playsRepository: UserPlaysRepository,
    invitesRepository: UserInvitesRepository,
  ) {
    super(userContext);
    this.playsRepository = playsRepository;
    this.invitesRepository = invitesRepository;
  }

  async execute(params: RespondToInviteUseCaseInput) {
    const { inviteUri } = params;
    const { playId, roleId } = await this.invitesRepository.respondToInvite({
      inviteUri,
      accept: true,
    });
    if (params.accept) {
      await this.playsRepository.joinPlay({ playId, roleId });
    }
    return Result.ok(undefined);
  }

  private invitesRepository: UserInvitesRepository;
  private playsRepository: UserPlaysRepository;
}
