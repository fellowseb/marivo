import z from "zod";
import { Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import type { PlaysCollectionRepository } from "./plays-collection.repository.ts";

export const GetMetadataUseCaseOutputSchema = z.object({
  genres: z.array(z.string()),
  periods: z.array(z.string()),
  count: z.number(),
});

type GetMetadataUseCaseOutput = z.infer<typeof GetMetadataUseCaseOutputSchema>;

export class GetMetadataUseCase extends AuthenticatedUseCase<{
  success: GetMetadataUseCaseOutput;
}> {
  constructor(repository: PlaysCollectionRepository, userContext: UserContextService) {
    super(userContext);
    this.repository = repository;
  }

  async execute() {
    const genresResult = await this.repository.findAllGenres();
    if (genresResult.isFailure()) {
      return Result.failure(genresResult.errorOrThrow());
    }
    const periodsResult = await this.repository.findAllPeriods();
    if (periodsResult.isFailure()) {
      return Result.failure(periodsResult.errorOrThrow());
    }
    const countResult = await this.repository.countAll();
    if (countResult.isFailure()) {
      return Result.failure(countResult.errorOrThrow());
    }
    return Result.ok({
      genres: genresResult.dataOrThrow().map((record) => record.get("key")),
      periods: periodsResult.dataOrThrow().map((record) => record.get("key")),
      count: countResult.dataOrThrow(),
    });
  }

  private repository: PlaysCollectionRepository;
}
