import z from 'zod';
import { Result } from '@marivo/utils';
import {
  AuthenticatedUseCase,
  UserContextService,
} from '../../shared/use-case.ts';
import type { PlaysRepository } from './plays.repository.ts';
import type { InvitesRepository } from './invites.repository.ts';

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
    repository: PlaysRepository,
    invitesRepository: InvitesRepository,
    userContext: UserContextService,
  ) {
    super(userContext);
    this.repository = repository;
    this.invitesRepository = invitesRepository;
  }

  async execute() {
    const { userId } = this.getUserContext();
    const plays = await this.repository.getAllPlays({ userId });
    const invites = await this.invitesRepository.getPendingInvites({ userId });
    return Result.ok({
      plays,
      invites,
    });
  }

  private repository: PlaysRepository;
  private invitesRepository: InvitesRepository;
}
