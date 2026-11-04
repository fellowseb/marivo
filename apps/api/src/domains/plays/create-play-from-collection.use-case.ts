import z from "zod";
import { v7 as uuidv7 } from "uuid";
import { Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import type { UserPlaysRepository } from "./user-plays.repository.ts";
import {
  CollectionPlayNotFound,
  type PlaysCollectionRepository,
} from "./plays-collection.repository.ts";

export const CreatePlayFromCollectionUseCaseInputSchema = z.object({
  title: z.string().max(100),
  collectionUri: z.string(),
});

export const CreatePlayFromCollectionUseCaseOutputSchema = z.object({
  uri: z.string().length(36),
});

type CreatePlayFromCollectionUseCaseInput = z.infer<typeof CreatePlayFromCollectionUseCaseInputSchema>;
type CreatePlayFromCollectionUseCaseOutput = z.infer<typeof CreatePlayFromCollectionUseCaseOutputSchema>;

class CreatePlayFromCollectionUseCase extends AuthenticatedUseCase<{
  params: CreatePlayFromCollectionUseCaseInput;
  success: CreatePlayFromCollectionUseCaseOutput;
  failure: CollectionPlayNotFound;
}> {
  constructor(
    playsRepository: UserPlaysRepository,
    collectionRepository: PlaysCollectionRepository,
    userContextService: UserContextService,
  ) {
    super(userContextService);
    this.playsRepository = playsRepository;
    this.collectionRepository = collectionRepository;
  }

  async execute(input: CreatePlayFromCollectionUseCaseInput) {
    const { title, collectionUri } = input;
    const scriptIdResult = await this.collectionRepository.getScriptIdByUri({ uri: collectionUri });
    if (scriptIdResult.isFailure()) {
      return Result.failure(scriptIdResult.errorOrThrow());
    }
    const uri = uuidv7();
    await this.playsRepository.createPlay({ title, uri, scriptId: scriptIdResult.dataOrThrow() });
    return Result.ok({ uri });
  }

  private playsRepository: UserPlaysRepository;
  private collectionRepository: PlaysCollectionRepository;
}

export default CreatePlayFromCollectionUseCase;
