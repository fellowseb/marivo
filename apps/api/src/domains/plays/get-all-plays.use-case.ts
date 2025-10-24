import z from 'zod';
import { Result } from '@marivo/utils';
import {
  AuthenticatedUseCase,
  UserContextService,
} from '../../shared/use-case.ts';
import type { UserPlaysRepository } from './user-plays.repository.ts';
import type { UserInvitesRepository } from './user-invites.repository.ts';

export const GetAllPlaysUseCaseOutputSchema = z.object({
  plays: z.array(
    z.object({
      uri: z.string(),
      title: z.string(),
      createdDate: z.date(),
      lastModifiedDate: z.date().optional(),
      isOwner: z.boolean(),
      ownerFullName: z.string().optional(),
      ownerUsername: z.string().optional(),
    }),
  ),
  invites: z.array(
    z.object({
      uri: z.string(),
      playTitle: z.string(),
      sentDate: z.date(),
      ownerFullName: z.string().optional(),
      ownerUsername: z.string().optional(),
    }),
  ),
});

type GetAllPlaysUseCaseOutput = z.infer<typeof GetAllPlaysUseCaseOutputSchema>;

export class GetAllPlaysUseCase extends AuthenticatedUseCase<{
  success: GetAllPlaysUseCaseOutput;
}> {
  constructor(
    repository: UserPlaysRepository,
    invitesRepository: UserInvitesRepository,
    userContext: UserContextService,
  ) {
    super(userContext);
    this.repository = repository;
    this.invitesRepository = invitesRepository;
  }

  async execute() {
    const plays = await this.repository.getAllPlays();
    const invites = await this.invitesRepository.getPendingInvites();
    return Result.ok({
      plays,
      invites,
    });
  }

  private repository: UserPlaysRepository;
  private invitesRepository: UserInvitesRepository;
}
