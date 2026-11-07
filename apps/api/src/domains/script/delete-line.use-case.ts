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

export const DeleteLineUseCaseInputSchema = z.object({
  uri: z.uuid(),
  lineId: z.uuidv4(),
  from: z.enum(["play", "collection"]).default("play"),
});

export const DeleteLineUseCaseOutputSchema = z.object({
  lastModifiedDate: z.date(),
});

type DeleteLineUseCaseInput = z.infer<typeof DeleteLineUseCaseInputSchema>;
type DeleteLineUseCaseOutput = z.infer<typeof DeleteLineUseCaseOutputSchema>;

export class DeleteLineUseCase extends AuthenticatedUseCase<{
  params: DeleteLineUseCaseInput;
  success: DeleteLineUseCaseOutput;
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
    params: DeleteLineUseCaseInput,
  ): Promise<
    Result<
      DeleteLineUseCaseOutput,
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
        return await this.scriptRepository.deleteLine({
          scriptId,
          lineId: params.lineId,
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
