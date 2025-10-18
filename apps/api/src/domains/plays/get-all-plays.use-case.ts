import z from 'zod';
import { clerkClient } from '@clerk/express';
import {
  AuthenticatedUseCase,
  UserContextService,
} from '../../shared/use-case.ts';
import { Result } from '../../shared/result.ts';
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
      ownerFullname: z.string().optional(),
      ownerUsername: z.string().optional(),
    }),
  ),
  invites: z.array(
    z.object({
      uri: z.string(),
      playTitle: z.string(),
      sentDate: z.date(),
      ownerFullname: z.string().optional(),
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
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 3000);
    });
    const { userId } = this.getUserContext();
    const plays = await this.repository.getAllPlays({ userId });
    const invites = await this.invitesRepository.getPendingInvites({ userId });
    const userClerkIds = plays
      .reduce((acc, { ownerClerkId }) => {
        return ownerClerkId ? [...acc, ownerClerkId] : acc;
      }, [] as string[])
      .concat(
        invites.reduce((acc, { playOwnerClerkId }) => {
          return playOwnerClerkId ? [...acc, playOwnerClerkId] : acc;
        }, [] as string[]),
      )
      .filter(Boolean);
    const usersInfos = new Map<
      string,
      {
        username: string;
        fullname: string;
      }
    >();

    const usersClerkData = await clerkClient.users.getUserList({
      userId: userClerkIds,
    });
    for (let index = 0; index < userClerkIds.length; index++) {
      if (usersClerkData.data[index]) {
        usersInfos.set(userClerkIds[index]!, {
          username: usersClerkData.data[index]?.username ?? '',
          fullname: usersClerkData.data[index]?.fullName ?? '',
        });
      }
    }
    const playsWithOwnerInfo = plays.map(
      this.addOwnerInfo('ownerClerkId', usersInfos),
    );
    const invitesWithOwnerInfo = invites.map(
      this.addOwnerInfo('playOwnerClerkId', usersInfos),
    );
    return Result.ok({
      plays: playsWithOwnerInfo,
      invites: invitesWithOwnerInfo,
    });
  }

  private addOwnerInfo<TProp extends string, T extends Record<TProp, string>>(
    ownerClerkIdProp: TProp,
    usersInfos: Map<
      string,
      {
        username: string;
        fullname: string;
      }
    >,
  ) {
    return (
      item: T,
    ): Omit<T, TProp> & { ownerUsername?: string; ownerFullname?: string } => {
      let ret = {
        ...item,
      };
      if (item[ownerClerkIdProp]) {
        const userInfo = usersInfos.get(item[ownerClerkIdProp]);
        ret = {
          ...ret,
          ownerFullname: userInfo?.fullname,
          ownerUsername: userInfo?.username,
        };
      }
      delete ret[ownerClerkIdProp];
      return ret;
    };
  }

  private repository: PlaysRepository;
  private invitesRepository: InvitesRepository;
}
