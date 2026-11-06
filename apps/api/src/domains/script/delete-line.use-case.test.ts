import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@marivo/utils";
import { DeleteLineUseCase } from "./delete-line.use-case.ts";
import { ScriptNotFound, type ScriptRepository } from "./script.repository.ts";
import { PlayNotFound, type UserPlaysRepository } from "../plays/user-plays.repository.ts";

describe("DeleteLineUseCase", () => {
  let scriptRepository: vi.Mocked<ScriptRepository>;
  let userPlaysRepository: vi.Mocked<UserPlaysRepository>;
  let playsCollectionRepository: vi.Mocked<PlaysCollectionRepository>;
  let userContext: UserContextService;
  let useCase: DeleteLineUseCase;

  beforeEach(() => {
    scriptRepository = {
      deleteLine: vi.fn(),
    } as unknown as vi.Mocked<ScriptRepository>;
    userPlaysRepository = {
      getScriptId: vi.fn(),
    } as unknown as vi.Mocked<UserPlaysRepository>;
    playsCollectionRepository = {
      getScriptIdByUri: vi.fn(),
    } as unknown as vi.Mocked<PlaysCollectionRepository>;
    userContext = { get: () => ({ userId: 1 }) } as unknown as UserContextService;
    useCase = new DeleteLineUseCase(
      scriptRepository,
      userPlaysRepository,
      playsCollectionRepository,
      userContext,
    );
  });

  it("deletes a line successfully", async () => {
    const uri = "550e8400-e29b-41d4-a716-446655440000";
    userPlaysRepository.getScriptId.mockResolvedValue(Result.ok(3));
    scriptRepository.deleteLine.mockResolvedValue(
      Result.ok({ lastModifiedDate: new Date("2026-01-01") }),
    );

    const result = await useCase.execute({
      uri,
      lineId: "line-to-delete",
    });

    expect(result.isOk()).toBe(true);
    expect(scriptRepository.deleteLine).toHaveBeenCalledWith({
      scriptId: 3,
      lineId: "line-to-delete",
    });
  });

  it("returns failure when play not found", async () => {
    userPlaysRepository.getScriptId.mockResolvedValue(Result.failure(new PlayNotFound()));

    const result = await useCase.execute({
      uri: "550e8400-e29b-41d4-a716-446655440000",
      lineId: "line-1",
    });

    expect(result.isFailure()).toBe(true);
    expect(scriptRepository.deleteLine).not.toHaveBeenCalled();
  });

  it("returns failure when script not found", async () => {
    userPlaysRepository.getScriptId.mockResolvedValue(Result.ok(404));
    scriptRepository.deleteLine.mockResolvedValue(Result.failure(new ScriptNotFound()));

    const result = await useCase.execute({
      uri: "550e8400-e29b-41d4-a716-446655440000",
      lineId: "line-1",
    });

    expect(result.isFailure()).toBe(true);
  });
});
