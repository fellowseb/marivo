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

export const SaveLineContentUseCaseInputSchema = z.object({
  uri: z.uuid(),
  lineId: z.uuidv4(),
  // Optional client-generated id. When provided, the server upserts the row
  // with this id so polling clients see the same id as the optimistic local
  // update (prevents duplicate entries).
  contentId: z.uuidv4().optional(),
  content: z.object({
    lineType: z.enum(["heading", "chartext", "freetext"]),
    text: z.string(),
    characters: z.array(z.uuidv4()).optional(),
    headingLevel: z.number().min(0).optional(),
  }),
  contentType: z.enum(["saved_version", "shared_draft", "draft"]),
  version: z.number().min(0).nullable().optional(),
  from: z.enum(["play", "collection"]).default("play"),
});

export const SaveLineContentUseCaseOutputSchema = z.object({
  contentId: z.uuidv4(),
  lastModifiedDate: z.date(),
});

type SaveLineContentUseCaseInput = z.infer<typeof SaveLineContentUseCaseInputSchema>;
type SaveLineContentUseCaseOutput = z.infer<typeof SaveLineContentUseCaseOutputSchema>;

export class SaveLineContentUseCase extends AuthenticatedUseCase<{
  params: SaveLineContentUseCaseInput;
  success: SaveLineContentUseCaseOutput;
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
    params: SaveLineContentUseCaseInput,
  ): Promise<
    Result<
      SaveLineContentUseCaseOutput,
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
        return await this.scriptRepository.saveLineContent({
          scriptId,
          lineId: params.lineId,
          contentId: params.contentId,
          content: params.content,
          contentType: params.contentType,
          version: params.version ?? null,
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
