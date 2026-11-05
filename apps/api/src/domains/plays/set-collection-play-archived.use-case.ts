import z from "zod";
import { hasCapability, Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import { ForbiddenError, InternalServerError } from "../../shared/error.ts";
import type {
  CollectionPlayNotFound,
  PlaysCollectionRepository,
} from "./plays-collection.repository.ts";

export const SetCollectionPlayArchivedUseCaseInputSchema = z.object({
  uri: z.string().length(36),
  archived: z.boolean(),
});

export const SetCollectionPlayArchivedUseCaseOutputSchema = z.object({
  archived: z.boolean(),
});

type SetCollectionPlayArchivedUseCaseInput = z.infer<
  typeof SetCollectionPlayArchivedUseCaseInputSchema
>;
type SetCollectionPlayArchivedUseCaseOutput = z.infer<
  typeof SetCollectionPlayArchivedUseCaseOutputSchema
>;

export class SetCollectionPlayArchivedUseCase extends AuthenticatedUseCase<{
  params: SetCollectionPlayArchivedUseCaseInput;
  success: SetCollectionPlayArchivedUseCaseOutput;
  failure: ForbiddenError | CollectionPlayNotFound | InternalServerError;
}> {
  constructor(repository: PlaysCollectionRepository, userContextService: UserContextService) {
    super(userContextService);
    this.repository = repository;
  }

  async execute(input: SetCollectionPlayArchivedUseCaseInput) {
    if (!hasCapability(this.getUserContext().role, "edit_collection_play_metadata")) {
      return Result.failure(
        new ForbiddenError("Capability 'edit_collection_play_metadata' is required"),
      );
    }
    const result = await this.repository.setArchived(input);
    if (result.isFailure()) {
      return Result.failure(result.errorOrThrow());
    }
    return Result.ok({ archived: input.archived });
  }

  private repository: PlaysCollectionRepository;
}
