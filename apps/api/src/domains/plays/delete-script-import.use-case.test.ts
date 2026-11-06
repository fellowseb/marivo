import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@marivo/utils";
import { DeleteScriptImportUseCase } from "./delete-script-import.use-case.ts";
import { ScriptImportNotFound } from "./script-imports.repository.ts";
import type { ScriptImportsRepository } from "./script-imports.repository.ts";
import type { UserContextService } from "../../shared/use-case.ts";

const IMPORT_ID = "550e8400-e29b-41d4-a716-446655440000";

function mockUserService(): UserContextService {
  return { get: () => ({ userId: 1 }) } as unknown as UserContextService;
}

describe("DeleteScriptImportUseCase", () => {
  let scriptImportsRepository: vi.Mocked<ScriptImportsRepository>;
  let useCase: DeleteScriptImportUseCase;

  beforeEach(() => {
    scriptImportsRepository = {
      deleteScriptImport: vi.fn(),
    } as unknown as vi.Mocked<ScriptImportsRepository>;
    useCase = new DeleteScriptImportUseCase(mockUserService(), scriptImportsRepository);
  });

  it("happy path: deletes the import and returns ok", async () => {
    scriptImportsRepository.deleteScriptImport.mockResolvedValue(Result.ok(undefined));

    const result = await useCase.execute({ importId: IMPORT_ID });

    expect(result.isOk()).toBe(true);
    expect(scriptImportsRepository.deleteScriptImport).toHaveBeenCalledWith(IMPORT_ID);
  });

  it("error case: propagates ScriptImportNotFound when the import does not exist (or belongs to another user)", async () => {
    scriptImportsRepository.deleteScriptImport.mockResolvedValue(
      Result.failure(new ScriptImportNotFound()),
    );

    const result = await useCase.execute({ importId: IMPORT_ID });

    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().message).toBe("Script import not found");
  });
});
