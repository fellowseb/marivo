import z from "zod";
import { v7 as uuidv7 } from "uuid";
import { hasCapability, Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import { ForbiddenError, InternalServerError } from "../../shared/error.ts";
import type { PlaysCollectionRepository } from "./plays-collection.repository.ts";
import { PlayAlreadyInCollection } from "./plays-collection.repository.ts";
import type { ScriptImportsRepository } from "./script-imports.repository.ts";
import { ScriptImportNotFound } from "./script-imports.repository.ts";

export const AddPlayToCollectionUseCaseInputSchema = z.object({
  /** The script import whose resulting script is published; no personal play is created. */
  importId: z.string().length(36),
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

export const AddPlayToCollectionUseCaseOutputSchema = z.object({
  uri: z.string().length(36),
});

type AddPlayToCollectionUseCaseInput = z.infer<typeof AddPlayToCollectionUseCaseInputSchema>;
type AddPlayToCollectionUseCaseOutput = z.infer<typeof AddPlayToCollectionUseCaseOutputSchema>;

export class AddPlayToCollectionUseCase extends AuthenticatedUseCase<{
  params: AddPlayToCollectionUseCaseInput;
  success: AddPlayToCollectionUseCaseOutput;
  failure: ForbiddenError | ScriptImportNotFound | PlayAlreadyInCollection | InternalServerError;
}> {
  constructor(
    collectionRepository: PlaysCollectionRepository,
    importsRepository: ScriptImportsRepository,
    userContextService: UserContextService,
  ) {
    super(userContextService);
    this.collectionRepository = collectionRepository;
    this.importsRepository = importsRepository;
  }

  async execute(input: AddPlayToCollectionUseCaseInput) {
    if (!hasCapability(this.getUserContext().role, "create_collection_play")) {
      return Result.failure(new ForbiddenError("Capability 'create_collection_play' is required"));
    }
    const scriptIdResult = await this.importsRepository.getResultScriptId({ id: input.importId });
    if (scriptIdResult.isFailure()) {
      return Result.failure(scriptIdResult.errorOrThrow());
    }
    const scriptId = scriptIdResult.dataOrThrow();
    const existsResult = await this.collectionRepository.existsByScriptId(scriptId);
    if (existsResult.isFailure()) {
      return Result.failure(existsResult.errorOrThrow());
    }
    if (existsResult.dataOrThrow()) {
      return Result.failure(new PlayAlreadyInCollection());
    }
    const uri = uuidv7();
    const insertResult = await this.collectionRepository.addToCollection({
      uri,
      title: input.title,
      author: input.author,
      lang: input.lang,
      numberOfRoles: input.numberOfRoles,
      numberOfMaleRoles: input.numberOfMaleRoles,
      numberOfFemaleRoles: input.numberOfFemaleRoles,
      genre: input.genre,
      period: input.period,
      synopsis: input.synopsis,
      scriptId,
    });
    if (insertResult.isFailure()) {
      return Result.failure(insertResult.errorOrThrow());
    }
    // no personal play is created in this flow: the import is consumed by the
    // collection entry, so mark it done to remove it from ongoing imports
    await this.importsRepository.setScriptImportDone({ importId: input.importId });
    return Result.ok({ uri: insertResult.dataOrThrow().uri });
  }

  private collectionRepository: PlaysCollectionRepository;
  private importsRepository: ScriptImportsRepository;
}

export default AddPlayToCollectionUseCase;
