import z from 'zod';
import { assertUnreachable, Result } from '@marivo/utils';
import {
  AuthenticatedUseCase,
  UserContextService,
} from '../../shared/use-case.ts';
import {
  PERMISSIONS_SCHEMA,
  RecordNotFound,
  UserPlaysRepository,
} from './user-plays.repository.ts';
import { AppError } from '../../shared/error.ts';

class UriNotFound extends AppError {
  constructor() {
    super('Play URI not found', 'NOT_FOUND');
  }
}

export const PlayDetailsUseCaseInputSchema = z.object({
  uri: z.string().max(36),
});

export const PlayDetailsUseCaseOutputSchema = z.object({
  details: z.object({
    id: z.number(),
    uri: z.string().length(36),
    title: z.string().max(100),
    createdDate: z.date(),
    lastModifiedDate: z.date(),
    isOwner: z.boolean(),
    ownerFullName: z.string(),
    ownerUsername: z.string(),
  }),
  participants: z.record(
    z.string(),
    z.object({
      fullName: z.string(),
    }),
  ),
  permissions: PERMISSIONS_SCHEMA.strict(),
});

type PlayDetailsUseCaseInput = z.infer<typeof PlayDetailsUseCaseInputSchema>;
type PlayDetailsUseCaseOutput = z.infer<typeof PlayDetailsUseCaseOutputSchema>;

export class PlayDetailsUseCase extends AuthenticatedUseCase<{
  params: PlayDetailsUseCaseInput;
  success: PlayDetailsUseCaseOutput;
  failure: UriNotFound;
}> {
  constructor(
    playsRepository: UserPlaysRepository,
    userContextService: UserContextService,
  ) {
    super(userContextService);
    this.playsRepository = playsRepository;
  }

  async execute(input: PlayDetailsUseCaseInput) {
    const { uri } = input;
    const detailsResult = await this.playsRepository.getPlayDetails({ uri });
    return detailsResult.match({
      success({ details, permissions, participants }) {
        return Result.ok({
          details,
          permissions,
          participants: {
            [details.ownerUsername]: { fullName: details.ownerFullName },
            ...participants,
          },
        });
      },
      failure(err) {
        if (err instanceof RecordNotFound) {
          return Result.failure(new UriNotFound());
        }
        return assertUnreachable(err);
      },
    });
  }

  private playsRepository: UserPlaysRepository;
}
