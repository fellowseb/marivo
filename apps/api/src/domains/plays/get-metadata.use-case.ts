import z from 'zod';
import { Result } from '@marivo/utils';
import {
  AuthenticatedUseCase,
  UserContextService,
} from '../../shared/use-case.ts';
import type { PlaysCollectionRepository } from './plays-collection.repository.ts';

export const GetMetadataUseCaseOutputSchema = z.object({
  genres: z.array(z.string()),
  periods: z.array(z.string()),
  count: z.number(),
});

type GetMetadataUseCaseOutput = z.infer<typeof GetMetadataUseCaseOutputSchema>;

export class GetMetadataUseCase extends AuthenticatedUseCase<{
  success: GetMetadataUseCaseOutput;
}> {
  constructor(
    repository: PlaysCollectionRepository,
    userContext: UserContextService,
  ) {
    super(userContext);
    this.repository = repository;
  }

  async execute() {
    const genres = (await this.repository.findAllGenres())
      .dataOrThrow()
      .map((record) => record.get('key'));
    const periods = (await this.repository.findAllPeriods())
      .dataOrThrow()
      .map((record) => record.get('key'));
    const count = (await this.repository.countAll()).dataOrThrow();
    return Result.ok({ genres, periods, count });
  }

  private repository: PlaysCollectionRepository;
}
