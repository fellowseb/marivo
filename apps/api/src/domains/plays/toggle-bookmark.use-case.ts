import z from "zod";
import { Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import {
  CollectionPlayNotFound,
  type PlaysCollectionRepository,
} from "./plays-collection.repository.ts";

export const ToggleBookmarkUseCaseInputSchema = z.object({
  playUri: z.string(),
});

export const ToggleBookmarkUseCaseOutputSchema = z.object({
  bookmarked: z.boolean(),
});

type ToggleBookmarkUseCaseInput = z.infer<typeof ToggleBookmarkUseCaseInputSchema>;
type ToggleBookmarkUseCaseOutput = z.infer<typeof ToggleBookmarkUseCaseOutputSchema>;

export class ToggleBookmarkUseCase extends AuthenticatedUseCase<{
  params: ToggleBookmarkUseCaseInput;
  success: ToggleBookmarkUseCaseOutput;
  failure: CollectionPlayNotFound;
}> {
  constructor(repository: PlaysCollectionRepository, userContext: UserContextService) {
    super(userContext);
    this.repository = repository;
  }

  async execute(input: ToggleBookmarkUseCaseInput) {
    const result = await this.repository.toggleBookmark({ playUri: input.playUri });
    if (result.isFailure()) {
      return Result.failure(result.errorOrThrow());
    }
    return Result.ok(result.dataOrThrow());
  }

  private repository: PlaysCollectionRepository;
}
