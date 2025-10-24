import z from 'zod';
import { assertUnreachable, Result } from '@marivo/utils';
import {
  AuthenticatedUseCase,
  UserContextService,
} from '../../shared/use-case.ts';
import {
  RecordNotFound,
  UserPlaysRepository,
} from './user-plays.repository.ts';
import { AppError } from '../../shared/error.ts';

class UriNotFound extends AppError {
  constructor() {
    super('Play URI not found', 'PLAY_URI_NOT_FOUND', 'client');
  }
}

export const PlayDetailsUseCaseInputSchema = z.object({
  uri: z.string().max(36),
});

export const PlayDetailsUseCaseOutputSchema = z.object({
  details: z.object({
    uri: z.string().length(36),
    title: z.string().max(100),
  }),
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
      success({ title }) {
        return Result.ok({
          details: {
            title,
            uri,
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
