import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@marivo/utils";
import CreatePlayFromImportUseCase from "./create-play-from-import.use-case.ts";
import { ScriptImportNotFound } from "./script-imports.repository.ts";
import type { ScriptImportsRepository } from "./script-imports.repository.ts";
import type { UserPlaysRepository } from "./user-plays.repository.ts";
import type { ScriptRepository } from "../script/script.repository.ts";
import { ScriptNotFound } from "../script/script.repository.ts";
import type { UserContextService } from "../../shared/use-case.ts";

const IMPORT_ID = "550e8400-e29b-41d4-a716-446655440000";
const KEEP = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"];

const userContext = { get: () => ({ userId: 1 }) } as unknown as UserContextService;

describe("CreatePlayFromImportUseCase", () => {
  let playsRepository: vi.Mocked<UserPlaysRepository>;
  let importsRepository: vi.Mocked<ScriptImportsRepository>;
  let scriptRepository: vi.Mocked<ScriptRepository>;
  let useCase: CreatePlayFromImportUseCase;

  beforeEach(() => {
    playsRepository = { createPlay: vi.fn() } as unknown as vi.Mocked<UserPlaysRepository>;
    importsRepository = {
      getResultScriptId: vi.fn(),
      setScriptImportDone: vi.fn(),
    } as unknown as vi.Mocked<ScriptImportsRepository>;
    scriptRepository = { copyScript: vi.fn() } as unknown as vi.Mocked<ScriptRepository>;
    useCase = new CreatePlayFromImportUseCase(
      playsRepository,
      importsRepository,
      scriptRepository,
      userContext,
    );
  });

  it("copies the result script (with lineIdsToKeep) instead of sharing it, and marks the import done", async () => {
    importsRepository.getResultScriptId.mockResolvedValue(Result.ok(42));
    scriptRepository.copyScript.mockResolvedValue(Result.ok(777));

    const result = await useCase.execute({
      title: "My play",
      importId: IMPORT_ID,
      lineIdsToKeep: KEEP,
    });

    expect(result.isOk()).toBe(true);
    expect(scriptRepository.copyScript).toHaveBeenCalledWith(42, KEEP);
    const call = vi.mocked(playsRepository.createPlay).mock.calls[0][0];
    expect(call.scriptId).toBe(777);
    expect(call.scriptId).not.toBe(42);
    expect(importsRepository.setScriptImportDone).toHaveBeenCalledWith({ importId: IMPORT_ID });
  });

  it("copies the full script when lineIdsToKeep is absent", async () => {
    importsRepository.getResultScriptId.mockResolvedValue(Result.ok(42));
    scriptRepository.copyScript.mockResolvedValue(Result.ok(777));

    const result = await useCase.execute({ title: "My play", importId: IMPORT_ID });

    expect(result.isOk()).toBe(true);
    expect(scriptRepository.copyScript).toHaveBeenCalledWith(42, undefined);
  });

  it("fails when the import does not exist (no copy, no play)", async () => {
    importsRepository.getResultScriptId.mockResolvedValue(
      Result.failure(new ScriptImportNotFound()),
    );

    const result = await useCase.execute({ title: "X", importId: IMPORT_ID });

    expect(result.isFailure()).toBe(true);
    expect(scriptRepository.copyScript).not.toHaveBeenCalled();
    expect(playsRepository.createPlay).not.toHaveBeenCalled();
  });

  it("fails when the script copy fails", async () => {
    importsRepository.getResultScriptId.mockResolvedValue(Result.ok(42));
    scriptRepository.copyScript.mockResolvedValue(Result.failure(new ScriptNotFound()));

    const result = await useCase.execute({ title: "X", importId: IMPORT_ID });

    expect(result.isFailure()).toBe(true);
    expect(playsRepository.createPlay).not.toHaveBeenCalled();
  });
});
