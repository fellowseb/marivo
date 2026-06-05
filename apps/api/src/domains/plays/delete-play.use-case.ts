import z from 'zod';
import { Result } from '@marivo/utils';
import {
  AuthenticatedUseCase,
  UserContextService,
} from '../../shared/use-case.ts';
import type { UserPlaysRepository } from './user-plays.repository.ts';
import { PlayNotFound } from './user-plays.repository.ts';

export const DeletePlayUseCaseInputSchema = z.object({
  uri: z.string(),
});

type DeletePlayUseCaseInput = z.infer<typeof DeletePlayUseCaseInputSchema>;

class NotOwnerError extends Error {
  constructor() {
    super('Only owner can delete the play');
  }
}

export class DeletePlayUseCase extends AuthenticatedUseCase<{
  params: DeletePlayUseCaseInput;
}> {
  constructor(
    userContext: UserContextService,
    playsRepository: UserPlaysRepository,
  ) {
    super(userContext);
    this.playsRepository = playsRepository;
  }

  async execute(params: DeletePlayUseCaseInput) {
    const result = await this.playsRepository.deletePlay({ uri: params.uri });
    if (result.isFailure()) {
      const error = result.errorOrThrow();
      if (error instanceof PlayNotFound) {
        throw new Error('Play not found or you are not the owner');
      }
      throw error;
    }
    return Result.ok(undefined);
  }

  private playsRepository: UserPlaysRepository;
}
