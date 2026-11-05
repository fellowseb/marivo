import z from "zod";
import { hasCapability, Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import { ForbiddenError, InternalServerError } from "../../shared/error.ts";
import type {
  CollectionPlayNotFound,
  PlaysCollectionRepository,
} from "./plays-collection.repository.ts";

export const UpdateCollectionPlayMetadataUseCaseInputSchema = z.object({
  uri: z.string().length(36),
  title: z.string().min(1).max(100),
  author: z.string().min(1).max(64),
  lang: z.enum(["fr", "en"]),
  numberOfRoles: z.number().int().min(0).optional(),
  numberOfMaleRoles: z.number().int().min(0).optional(),
  numberOfFemaleRoles: z.number().int().min(0).optional(),
  genre: z.string().max(50).optional(),
  period: z.string().max(50).optional(),
  synopsis: z.string().max(10000).optional(),
});

type UpdateCollectionPlayMetadataUseCaseInput = z.infer<
  typeof UpdateCollectionPlayMetadataUseCaseInputSchema
>;

export class UpdateCollectionPlayMetadataUseCase extends AuthenticatedUseCase<{
  params: UpdateCollectionPlayMetadataUseCaseInput;
  success: undefined;
  failure: ForbiddenError | CollectionPlayNotFound | InternalServerError;
}> {
  constructor(repository: PlaysCollectionRepository, userContextService: UserContextService) {
    super(userContextService);
    this.repository = repository;
  }

  async execute(input: UpdateCollectionPlayMetadataUseCaseInput) {
    if (!hasCapability(this.getUserContext().role, "edit_collection_play_metadata")) {
      return Result.failure(
        new ForbiddenError("Capability 'edit_collection_play_metadata' is required"),
      );
    }
    const result = await this.repository.updateMetadata(input);
    if (result.isFailure()) {
      return Result.failure(result.errorOrThrow());
    }
    return Result.ok(undefined);
  }

  private repository: PlaysCollectionRepository;
}
