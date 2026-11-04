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

export const CreateLineUseCaseInputSchema = z.object({
  uri: z.uuid(),
  lineId: z.uuidv4(),
  lineType: z.enum(["heading", "chartext", "freetext"]),
  position: z.number().min(0),
  from: z.enum(["play", "collection"]).default("play"),
});

export const CreateLineUseCaseOutputSchema = z.object({
  lastModifiedDate: z.date(),
});

type CreateLineUseCaseInput = z.infer<typeof CreateLineUseCaseInputSchema>;
type CreateLineUseCaseOutput = z.infer<typeof CreateLineUseCaseOutputSchema>;

export class CreateLineUseCase extends AuthenticatedUseCase<{
  params: CreateLineUseCaseInput;
  success: CreateLineUseCaseOutput;
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
    params: CreateLineUseCaseInput,
  ): Promise<
    Result<CreateLineUseCaseOutput, ScriptNotFound | PlayNotFound | CollectionPlayNotFound | ForbiddenError>
  > {
    const scriptIdResult = await resolveEditableScriptId(
      { uri: params.uri, from: params.from },
      {
        userPlaysRepository: this.userPlaysRepository,
        playsCollectionRepository: this.playsCollectionRepository,
        userContext: this.getUserContext(),
      },
    );
    return scriptIdResult.match({
      success: async (scriptId) => {
        return await this.scriptRepository.createLine({
          scriptId,
          lineId: params.lineId,
          lineType: params.lineType,
          position: params.position,
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
