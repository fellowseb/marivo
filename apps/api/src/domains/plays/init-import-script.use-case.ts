import z from "zod";
// uuidv4, not v7: importId is validated as a v4 uuid in several input schemas
// (e.g. worker/storage.getPresignedUrl), so the server-generated id must stay v4
import { v4 as uuidv4 } from "uuid";
import { Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import type { AppError } from "../../shared/error.ts";
import { ScriptImportsRepository } from "./script-imports.repository.ts";

export const InitImportScriptUseCaseInputSchema = z.object({
  files: z.array(
    z.discriminatedUnion("type", [
      z.object({
        id: z.string(),
        type: z.literal("url"),
        url: z.url(),
      }),
      z.object({
        id: z.string(),
        type: z.literal("file"),
        size: z.number(),
        name: z.string(),
      }),
    ]),
  ),
});

/** The import id is generated server-side: the client only polls once it has it. */
export const InitImportScriptUseCaseOutputSchema = z.object({
  importId: z.string().length(36),
});

type InitImportScriptUseCaseInput = z.infer<typeof InitImportScriptUseCaseInputSchema>;
type InitImportScriptUseCaseOutput = z.infer<typeof InitImportScriptUseCaseOutputSchema>;

class InitImportScriptUseCase extends AuthenticatedUseCase<{
  params: InitImportScriptUseCaseInput;
  success: InitImportScriptUseCaseOutput;
  failure: AppError;
}> {
  constructor(
    scriptImportsRepository: ScriptImportsRepository,
    userContextService: UserContextService,
  ) {
    super(userContextService);
    this.scriptImportsRepository = scriptImportsRepository;
  }

  async execute(input: InitImportScriptUseCaseInput) {
    const importId = uuidv4();
    await this.scriptImportsRepository.initImport({
      importId,
      files: input.files,
    });
    return Result.ok({ importId });
  }

  private scriptImportsRepository: ScriptImportsRepository;
}

export default InitImportScriptUseCase;
