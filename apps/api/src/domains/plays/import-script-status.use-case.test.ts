import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@marivo/utils";
import {
  ImportScriptStatusUseCase,
  ImportScriptStatusUseCaseOutputSchema,
} from "./import-script-status.use-case.ts";
import type { ScriptImportsRepository } from "./script-imports.repository.ts";
import type { UserContextService } from "../../shared/use-case.ts";

const IMPORT_ID = "550e8400-e29b-41d4-a716-446655440000";

function mockUserService(): UserContextService {
  return { get: () => ({ userId: 1 }) } as unknown as UserContextService;
}

describe("ImportScriptStatusUseCase", () => {
  let scriptImportsRepository: vi.Mocked<ScriptImportsRepository>;
  let useCase: ImportScriptStatusUseCase;

  beforeEach(() => {
    scriptImportsRepository = {
      getScriptImportStatus: vi.fn(),
    } as unknown as vi.Mocked<ScriptImportsRepository>;
    useCase = new ImportScriptStatusUseCase(mockUserService(), scriptImportsRepository);
  });

  it("reviewing status output validates when characters are objects (regression)", async () => {
    scriptImportsRepository.getScriptImportStatus.mockResolvedValue(
      Result.ok({
        id: IMPORT_ID,
        status: "reviewing",
        metadata: {
          title: "Hamlet",
          author: "Shakespeare",
          language: "en",
          characters: [
            { id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", name: "HAMLET", description: " prince", genre: "male" },
          ],
          number_of_roles: 1,
          number_of_male_roles: 1,
          number_of_female_roles: 0,
        },
      }),
    );

    const result = await useCase.execute({ importId: IMPORT_ID });

    expect(result.isOk()).toBe(true);
    // This safeParse is what tRPC's output validator does — it used to fail with
    // "expected string, received object" at metadata.characters
    const parsed = ImportScriptStatusUseCaseOutputSchema.safeParse(result.dataOrThrow());
    expect(parsed.success).toBe(true);
  });

  it("non-reviewing status output validates", async () => {
    scriptImportsRepository.getScriptImportStatus.mockResolvedValue(
      Result.ok({ id: IMPORT_ID, status: "processing_files" }),
    );

    const result = await useCase.execute({ importId: IMPORT_ID });

    expect(result.isOk()).toBe(true);
    const parsed = ImportScriptStatusUseCaseOutputSchema.safeParse(result.dataOrThrow());
    expect(parsed.success).toBe(true);
  });

  it("returns failure when import not found", async () => {
    scriptImportsRepository.getScriptImportStatus.mockResolvedValue(
      Result.failure(new (class extends Error {})() as never),
    );

    const result = await useCase.execute({ importId: IMPORT_ID });
    expect(result.isFailure()).toBe(true);
  });
});
