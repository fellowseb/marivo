import z from "zod";
import { Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import { ForbiddenError } from "../../shared/error.ts";
import { ScriptNotFound, ScriptRepository } from "./script.repository.ts";
import { resolveEditableScriptId } from "./resolve-editable-script.ts";
import type { PlayNotFound, UserPlaysRepository } from "../plays/user-plays.repository.ts";
import type {
  CollectionPlayNotFound,
  PlaysCollectionRepository,
} from "../plays/plays-collection.repository.ts";

export const DeleteLineContentUseCaseInputSchema = z.object({
  uri: z.uuid(),
  lineId: z.uuidv4(),
  contentId: z.uuidv4(),
  from: z.enum(["play", "collection"]).default("play"),
});

export const DeleteLineContentUseCaseOutputSchema = z.object({
  lastModifiedDate: z.date(),
});

type DeleteLineContentUseCaseInput = z.infer<typeof DeleteLineContentUseCaseInputSchema>;
type DeleteLineContentUseCaseOutput = z.infer<typeof DeleteLineContentUseCaseOutputSchema>;

export class DeleteLineContentUseCase extends AuthenticatedUseCase<{
  params: DeleteLineContentUseCaseInput;
  success: DeleteLineContentUseCaseOutput;
  failure: ScriptNotFound | PlayNotFound | CollectionPlayNotFound | ForbiddenError;
}> {
  constructor(
    scriptRepository: ScriptRepository,
    userPlaysRepository: UserPlaysRepository,
    playsCollectionRepository: PlaysCollectionRepository,
    userContextService: UserContextService,
  ) {
    super(userContextService);
    this.scriptRepository = scriptRepository;
    this.userPlaysRepository = userPlaysRepository;
    this.playsCollectionRepository = playsCollectionRepository;
  }

  async execute(
    params: DeleteLineContentUseCaseInput,
  ): Promise<
    Result<
      DeleteLineContentUseCaseOutput,
      ScriptNotFound | PlayNotFound | CollectionPlayNotFound | ForbiddenError
    >
  > {
    const scriptIdResult = await resolveEditableScriptId(
      { uri: params.uri, from: params.from, permission: "scriptWrite" },
      {
        userPlaysRepository: this.userPlaysRepository,
        playsCollectionRepository: this.playsCollectionRepository,
        userContext: this.getUserContext(),
      },
    );
    return scriptIdResult.match({
      success: async (scriptId) => {
        return await this.scriptRepository.deleteLineContent({
          scriptId,
          lineId: params.lineId,
          contentId: params.contentId,
        });
      },
      failure: async (error) => {
        return Result.failure(error);
      },
    });
  }

  private scriptRepository: ScriptRepository;
  private userPlaysRepository: UserPlaysRepository;
  private playsCollectionRepository: PlaysCollectionRepository;
}
