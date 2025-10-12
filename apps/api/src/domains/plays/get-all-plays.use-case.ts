import z from 'zod';
import {
  AuthenticatedUseCase,
  UserContextService,
} from '../../shared/use-case.ts';
import { Result } from '../../shared/result.ts';
import type { PlaysRepository } from './plays.repository.ts';

export const GetAllPlaysUseCaseOutputSchema = z.object({
  plays: z.array(
    z.object({
      uri: z.string(),
      title: z.string(),
      createdDate: z.date(),
      lastModifiedDate: z.date().optional(),
      isOwner: z.boolean(),
    }),
  ),
});

type GetAllPlaysUseCaseOutput = z.infer<typeof GetAllPlaysUseCaseOutputSchema>;

export class GetAllPlaysUseCase extends AuthenticatedUseCase<{
  success: GetAllPlaysUseCaseOutput;
}> {
  constructor(repository: PlaysRepository, userContext: UserContextService) {
    super(userContext);
    this.repository = repository;
  }

  async execute() {
    const { userId } = this.getUserContext();
    const plays = await this.repository.getAllPlays({ userId });
    return Result.ok({ plays });
  }

  private repository: PlaysRepository;
}
