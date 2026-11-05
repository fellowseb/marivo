import z from "zod";
import { Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import type {
  CollectionPlayNotFound,
  PlaysCollectionRepository,
} from "./plays-collection.repository.ts";
import type { InternalServerError } from "../../shared/error.ts";

export const GetCollectionPlayUseCaseInputSchema = z.object({
  uri: z.string().length(36),
});

export const GetCollectionPlayUseCaseOutputSchema = z.object({
  uri: z.string().length(36),
  title: z.string(),
  author: z.string(),
});

type GetCollectionPlayUseCaseInput = z.infer<typeof GetCollectionPlayUseCaseInputSchema>;
type GetCollectionPlayUseCaseOutput = z.infer<typeof GetCollectionPlayUseCaseOutputSchema>;

export class GetCollectionPlayUseCase extends AuthenticatedUseCase<{
  params: GetCollectionPlayUseCaseInput;
  success: GetCollectionPlayUseCaseOutput;
  failure: CollectionPlayNotFound | InternalServerError;
}> {
  constructor(repository: PlaysCollectionRepository, userContextService: UserContextService) {
    super(userContextService);
    this.repository = repository;
  }

  async execute(input: GetCollectionPlayUseCaseInput) {
    const result = await this.repository.findByUri({ uri: input.uri });
    if (result.isFailure()) {
      return Result.failure(result.errorOrThrow());
    }
    return Result.ok(result.dataOrThrow());
  }

  private repository: PlaysCollectionRepository;
}
