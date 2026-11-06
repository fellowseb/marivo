import z from "zod";
import { Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import type { AppError } from "../../shared/error.ts";
import type { ScriptImportsRepository } from "./script-imports.repository.ts";

export const DeleteScriptImportUseCaseInputSchema = z.object({
  importId: z.string().length(36),
});

type DeleteScriptImportUseCaseInput = z.infer<typeof DeleteScriptImportUseCaseInputSchema>;

export class DeleteScriptImportUseCase extends AuthenticatedUseCase<{
  params: DeleteScriptImportUseCaseInput;
  failure: AppError;
}> {
  constructor(userContext: UserContextService, scriptImportsRepository: ScriptImportsRepository) {
    super(userContext);
    this.scriptImportsRepository = scriptImportsRepository;
  }

  async execute(params: DeleteScriptImportUseCaseInput) {
    const result = await this.scriptImportsRepository.deleteScriptImport(params.importId);
    if (result.isFailure()) {
      return Result.failure(result.errorOrThrow());
    }
    return Result.ok(undefined);
  }

  private scriptImportsRepository: ScriptImportsRepository;
}
