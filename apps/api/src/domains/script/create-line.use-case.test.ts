import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@marivo/utils";
import { CreateLineUseCase } from "./create-line.use-case.ts";
import { ScriptNotFound, type ScriptRepository } from "./script.repository.ts";
import { PlayNotFound, type UserPlaysRepository } from "../plays/user-plays.repository.ts";

describe("CreateLineUseCase", () => {
  let scriptRepository: vi.Mocked<ScriptRepository>;
  let userPlaysRepository: vi.Mocked<UserPlaysRepository>;
  let useCase: CreateLineUseCase;

  beforeEach(() => {
    scriptRepository = {
      createLine: vi.fn(),
    } as unknown as vi.Mocked<ScriptRepository>;
    userPlaysRepository = {
      getScriptId: vi.fn(),
    } as unknown as vi.Mocked<UserPlaysRepository>;
    useCase = new CreateLineUseCase(scriptRepository, userPlaysRepository);
  });

  it("creates a heading line at position 0", async () => {
    const uri = "550e8400-e29b-41d4-a716-446655440000";
    userPlaysRepository.getScriptId.mockResolvedValue(Result.ok(7));
    scriptRepository.createLine.mockResolvedValue(
      Result.ok({ lastModifiedDate: new Date("2026-01-01") }),
    );

    const result = await useCase.execute({
      uri,
      lineId: "new-line-1",
      lineType: "heading",
      position: 0,
    });

    expect(result.isOk()).toBe(true);
    expect(scriptRepository.createLine).toHaveBeenCalledWith({
      scriptId: 7,
      lineId: "new-line-1",
      lineType: "heading",
      position: 0,
    });
  });

  it("creates a chartext line at position 5", async () => {
    const uri = "550e8400-e29b-41d4-a716-446655440000";
    userPlaysRepository.getScriptId.mockResolvedValue(Result.ok(7));
    scriptRepository.createLine.mockResolvedValue(Result.ok({ lastModifiedDate: new Date() }));

    await useCase.execute({
      uri,
      lineId: "new-line-2",
      lineType: "chartext",
      position: 5,
    });

    expect(scriptRepository.createLine).toHaveBeenCalledWith(
      expect.objectContaining({ lineType: "chartext", position: 5 }),
    );
  });

  it("returns failure when play not found", async () => {
    userPlaysRepository.getScriptId.mockResolvedValue(Result.failure(new PlayNotFound()));

    const result = await useCase.execute({
      uri: "550e8400-e29b-41d4-a716-446655440000",
      lineId: "line-1",
      lineType: "freetext",
      position: 0,
    });

    expect(result.isFailure()).toBe(true);
    expect(scriptRepository.createLine).not.toHaveBeenCalled();
  });

  it("returns failure when script not found", async () => {
    userPlaysRepository.getScriptId.mockResolvedValue(Result.ok(999));
    scriptRepository.createLine.mockResolvedValue(Result.failure(new ScriptNotFound()));

    const result = await useCase.execute({
      uri: "550e8400-e29b-41d4-a716-446655440000",
      lineId: "line-1",
      lineType: "freetext",
      position: 0,
    });

    expect(result.isFailure()).toBe(true);
  });
});
