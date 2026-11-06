import z from "zod";
import { v7 as uuidv7 } from "uuid";
import { Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import type { UserPlaysRepository } from "./user-plays.repository.ts";
import { ScriptImportNotFound, ScriptImportsRepository } from "./script-imports.repository.ts";
import type { ScriptRepository } from "../script/script.repository.ts";

export const CreatePlayFromImportUseCaseInputSchema = z.object({
  title: z.string().max(100),
  importId: z.string(),
  /** Lines to keep in the created play's script; absent = keep all. */
  lineIdsToKeep: z.array(z.uuid()).optional(),
});

export const CreatePlayFromImportUseCaseOutputSchema = z.object({
  uri: z.string().length(36),
});

type CreatePlayFromImportUseCaseInput = z.infer<typeof CreatePlayFromImportUseCaseInputSchema>;
type CreatePlayFromImportUseCaseOutput = z.infer<typeof CreatePlayFromImportUseCaseOutputSchema>;

class CreatePlayFromImportUseCase extends AuthenticatedUseCase<{
  params: CreatePlayFromImportUseCaseInput;
  success: CreatePlayFromImportUseCaseOutput;
  failure: ScriptImportNotFound;
}> {
  constructor(
    playsRepository: UserPlaysRepository,
    importsRepository: ScriptImportsRepository,
    scriptRepository: ScriptRepository,
    userContextService: UserContextService,
  ) {
    super(userContextService);
    this.playsRepository = playsRepository;
    this.importsRepository = importsRepository;
    this.scriptRepository = scriptRepository;
  }

  async execute(input: CreatePlayFromImportUseCaseInput) {
    const { title, importId, lineIdsToKeep } = input;
    const uri = uuidv7();
    const scriptIdResult = await this.importsRepository.getResultScriptId({ id: importId });
    if (scriptIdResult.isFailure()) {
      return Result.failure(scriptIdResult.errorOrThrow());
    }
    // Copy the import's result script (optionally stripped to the selected
    // lines) instead of sharing it: edits to the new play must not modify
    // the import result.
    const copyResult = await this.scriptRepository.copyScript(
      scriptIdResult.dataOrThrow(),
      lineIdsToKeep,
    );
    if (copyResult.isFailure()) {
      return Result.failure(copyResult.errorOrThrow());
    }
    await this.playsRepository.createPlay({ title, uri, scriptId: copyResult.dataOrThrow() });
    await this.importsRepository.setScriptImportDone({ importId });
    return Result.ok({ uri });
  }

  private playsRepository: UserPlaysRepository;
  private importsRepository: ScriptImportsRepository;
  private scriptRepository: ScriptRepository;
}

export default CreatePlayFromImportUseCase;
