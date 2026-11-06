import z from "zod";
import { v7 as uuidv7 } from "uuid";
import { Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import type { UserPlaysRepository } from "./user-plays.repository.ts";
import {
  CollectionPlayNotFound,
  type PlaysCollectionRepository,
} from "./plays-collection.repository.ts";
import type { ScriptRepository } from "../script/script.repository.ts";

export const CreatePlayFromCollectionUseCaseInputSchema = z.object({
  title: z.string().max(100),
  collectionUri: z.string(),
  /** Lines to keep in the copied script; absent = keep all. */
  lineIdsToKeep: z.array(z.uuid()).optional(),
});

export const CreatePlayFromCollectionUseCaseOutputSchema = z.object({
  uri: z.string().length(36),
});

type CreatePlayFromCollectionUseCaseInput = z.infer<
  typeof CreatePlayFromCollectionUseCaseInputSchema
>;
type CreatePlayFromCollectionUseCaseOutput = z.infer<
  typeof CreatePlayFromCollectionUseCaseOutputSchema
>;

class CreatePlayFromCollectionUseCase extends AuthenticatedUseCase<{
  params: CreatePlayFromCollectionUseCaseInput;
  success: CreatePlayFromCollectionUseCaseOutput;
  failure: CollectionPlayNotFound;
}> {
  constructor(
    playsRepository: UserPlaysRepository,
    collectionRepository: PlaysCollectionRepository,
    scriptRepository: ScriptRepository,
    userContextService: UserContextService,
  ) {
    super(userContextService);
    this.playsRepository = playsRepository;
    this.collectionRepository = collectionRepository;
    this.scriptRepository = scriptRepository;
  }

  async execute(input: CreatePlayFromCollectionUseCaseInput) {
    const { title, collectionUri } = input;
    const scriptIdResult = await this.collectionRepository.getScriptIdByUri({ uri: collectionUri });
    if (scriptIdResult.isFailure()) {
      return Result.failure(scriptIdResult.errorOrThrow());
    }
    // Copy the script instead of sharing it: edits to the new play must not
    // modify the collection play, and vice versa. Only the latest saved
    // version of each line is copied (shared drafts / drafts are dropped).
    const copyResult = await this.scriptRepository.copyScript(
      scriptIdResult.dataOrThrow(),
      input.lineIdsToKeep,
    );
    if (copyResult.isFailure()) {
      return Result.failure(copyResult.errorOrThrow());
    }
    const uri = uuidv7();
    await this.playsRepository.createPlay({ title, uri, scriptId: copyResult.dataOrThrow() });
    return Result.ok({ uri });
  }

  private playsRepository: UserPlaysRepository;
  private collectionRepository: PlaysCollectionRepository;
  private scriptRepository: ScriptRepository;
}

export default CreatePlayFromCollectionUseCase;
