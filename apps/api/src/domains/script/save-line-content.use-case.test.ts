import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { Result } from "@marivo/utils";
import { SaveLineContentUseCase } from "./save-line-content.use-case.ts";
import { ScriptNotFound, type ScriptRepository } from "./script.repository.ts";
import type { UserPlaysRepository } from "../plays/user-plays.repository.ts";
import { PlayNotFound } from "../plays/user-plays.repository.ts";

describe("SaveLineContentUseCase", () => {
  let scriptRepository: jest.Mocked<ScriptRepository>;
  let userPlaysRepository: jest.Mocked<UserPlaysRepository>;
  let useCase: SaveLineContentUseCase;

  beforeEach(() => {
    scriptRepository = {
      saveLineContent: jest.fn(),
    } as unknown as jest.Mocked<ScriptRepository>;
    userPlaysRepository = {
      getScriptId: jest.fn(),
    } as unknown as jest.Mocked<UserPlaysRepository>;
    useCase = new SaveLineContentUseCase(scriptRepository, userPlaysRepository);
  });

  it("saves line content when play exists", async () => {
    const uri = "550e8400-e29b-41d4-a716-446655440000";
    userPlaysRepository.getScriptId.mockResolvedValue(Result.ok(42));
    scriptRepository.saveLineContent.mockResolvedValue(
      Result.ok({
        contentId: "content-1",
        lastModifiedDate: new Date("2026-01-01"),
      }),
    );

    const result = await useCase.execute({
      uri,
      lineId: "line-1",
      content: {
        lineType: "freetext",
        text: "Hello world",
      },
      contentType: "saved_version",
      version: 1,
    });

    expect(result.isOk()).toBe(true);
    const ok = result.dataOrThrow();
    expect(ok.contentId).toBe("content-1");
    expect(scriptRepository.saveLineContent).toHaveBeenCalledWith({
      scriptId: 42,
      lineId: "line-1",
      content: { lineType: "freetext", text: "Hello world" },
      contentType: "saved_version",
      version: 1,
    });
  });

  it("returns failure when play not found", async () => {
    userPlaysRepository.getScriptId.mockResolvedValue(Result.failure(new PlayNotFound()));

    const result = await useCase.execute({
      uri: "550e8400-e29b-41d4-a716-446655440000",
      lineId: "line-1",
      content: { lineType: "freetext", text: "test" },
      contentType: "saved_version",
    });

    expect(result.isFailure()).toBe(true);
    expect(scriptRepository.saveLineContent).not.toHaveBeenCalled();
  });

  it("returns failure when script not found", async () => {
    userPlaysRepository.getScriptId.mockResolvedValue(Result.ok(99));
    scriptRepository.saveLineContent.mockResolvedValue(Result.failure(new ScriptNotFound()));

    const result = await useCase.execute({
      uri: "550e8400-e29b-41d4-a716-446655440000",
      lineId: "line-1",
      content: { lineType: "heading", text: "Act I", headingLevel: 1 },
      contentType: "shared_draft",
    });

    expect(result.isFailure()).toBe(true);
  });

  it("passes characters for chartext lines", async () => {
    const uri = "550e8400-e29b-41d4-a716-446655440000";
    userPlaysRepository.getScriptId.mockResolvedValue(Result.ok(1));
    scriptRepository.saveLineContent.mockResolvedValue(
      Result.ok({ contentId: "c1", lastModifiedDate: new Date() }),
    );

    await useCase.execute({
      uri,
      lineId: "line-1",
      content: {
        lineType: "chartext",
        text: "To be or not to be",
        characters: ["char-1", "char-2"],
      },
      contentType: "saved_version",
      version: 2,
    });

    expect(scriptRepository.saveLineContent).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          lineType: "chartext",
          characters: ["char-1", "char-2"],
        }),
      }),
    );
  });
});
