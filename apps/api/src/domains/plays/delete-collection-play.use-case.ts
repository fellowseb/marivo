import z from "zod";
import { hasCapability, Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import { ForbiddenError, InternalServerError } from "../../shared/error.ts";
import type {
  CollectionPlayNotFound,
  PlaysCollectionRepository,
} from "./plays-collection.repository.ts";

export const DeleteCollectionPlayUseCaseInputSchema = z.object({
  uri: z.string().length(36),
});

type DeleteCollectionPlayUseCaseInput = z.infer<typeof DeleteCollectionPlayUseCaseInputSchema>;

export class DeleteCollectionPlayUseCase extends AuthenticatedUseCase<{
  params: DeleteCollectionPlayUseCaseInput;
  success: undefined;
  failure: ForbiddenError | CollectionPlayNotFound | InternalServerError;
}> {
  constructor(repository: PlaysCollectionRepository, userContextService: UserContextService) {
    super(userContextService);
    this.repository = repository;
  }

  async execute(input: DeleteCollectionPlayUseCaseInput) {
    if (!hasCapability(this.getUserContext().role, "delete_collection_play")) {
      return Result.failure(
        new ForbiddenError("Capability 'delete_collection_play' is required"),
      );
    }
    const result = await this.repository.deleteByUri({ uri: input.uri });
    if (result.isFailure()) {
      return Result.failure(result.errorOrThrow());
    }
    return Result.ok(undefined);
  }

  private repository: PlaysCollectionRepository;
}
