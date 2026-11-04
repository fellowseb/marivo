import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@marivo/utils";
import { SaveLineContentUseCase } from "./save-line-content.use-case.ts";
import { CreateLineUseCase } from "./create-line.use-case.ts";
import { DeleteLineUseCase } from "./delete-line.use-case.ts";
import type { ScriptRepository } from "./script.repository.ts";
import type { UserPlaysRepository } from "../plays/user-plays.repository.ts";
import type { PlaysCollectionRepository } from "../plays/plays-collection.repository.ts";
import type { UserContextService } from "../../shared/use-case.ts";

/**
 * Integration tests for happy paths of script write use cases.
 * These test the full flow: use case -> repository call -> success result.
 * The database layer is mocked, but the use case logic is real.
 */
describe("Script write endpoints - integration (happy paths)", () => {
  const PLAY_URI = "550e8400-e29b-41d4-a716-446655440000";
  const SCRIPT_ID = 42;

  let scriptRepository: vi.Mocked<ScriptRepository>;
  let userPlaysRepository: vi.Mocked<UserPlaysRepository>;
  let playsCollectionRepository: vi.Mocked<PlaysCollectionRepository>;
  let userContext: UserContextService;

  beforeEach(() => {
    scriptRepository = {
      saveLineContent: vi.fn(),
      createLine: vi.fn(),
      deleteLine: vi.fn(),
    } as unknown as vi.Mocked<ScriptRepository>;
    userPlaysRepository = {
      getScriptId: vi.fn().mockResolvedValue(Result.ok(SCRIPT_ID)),
    } as unknown as vi.Mocked<UserPlaysRepository>;
    playsCollectionRepository = {
      getScriptIdByUri: vi.fn(),
    } as unknown as vi.Mocked<PlaysCollectionRepository>;
    userContext = { get: () => ({ userId: 1 }) } as unknown as UserContextService;
  });

  describe("saveLineContent happy path", () => {
    it("saves a freetext line and returns content id", async () => {
      const useCase = new SaveLineContentUseCase(scriptRepository, userPlaysRepository, playsCollectionRepository, userContext);
      const contentId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
      scriptRepository.saveLineContent.mockResolvedValue(
        Result.ok({
          contentId,
          lastModifiedDate: new Date("2026-01-15T12:00:00Z"),
        }),
      );

      const result = await useCase.execute({
        uri: PLAY_URI,
        lineId: "line-1",
        content: { lineType: "freetext", text: "Scene description" },
        contentType: "saved_version",
        version: 1,
      });

      expect(result.isOk()).toBe(true);
      const output = result.dataOrThrow();
      expect(output.contentId).toBe(contentId);
      expect(output.lastModifiedDate).toBeInstanceOf(Date);
      expect(scriptRepository.saveLineContent).toHaveBeenCalledTimes(1);
    });

    it("saves a heading line with level", async () => {
      const useCase = new SaveLineContentUseCase(scriptRepository, userPlaysRepository, playsCollectionRepository, userContext);
      scriptRepository.saveLineContent.mockResolvedValue(
        Result.ok({
          contentId: "heading-content-1",
          lastModifiedDate: new Date(),
        }),
      );

      const result = await useCase.execute({
        uri: PLAY_URI,
        lineId: "line-2",
        content: { lineType: "heading", text: "ACT I", headingLevel: 1 },
        contentType: "shared_draft",
      });

      expect(result.isOk()).toBe(true);
      expect(scriptRepository.saveLineContent).toHaveBeenCalledWith(
        expect.objectContaining({
          scriptId: SCRIPT_ID,
          content: expect.objectContaining({
            lineType: "heading",
            headingLevel: 1,
          }),
          contentType: "shared_draft",
        }),
      );
    });

    it("saves a chartext line with characters", async () => {
      const useCase = new SaveLineContentUseCase(scriptRepository, userPlaysRepository, playsCollectionRepository, userContext);
      scriptRepository.saveLineContent.mockResolvedValue(
        Result.ok({ contentId: "cue-1", lastModifiedDate: new Date() }),
      );

      const result = await useCase.execute({
        uri: PLAY_URI,
        lineId: "line-3",
        content: {
          lineType: "chartext",
          text: "To be or not to be",
          characters: ["hamlet-id"],
        },
        contentType: "saved_version",
        version: 3,
      });

      expect(result.isOk()).toBe(true);
      expect(scriptRepository.saveLineContent).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            lineType: "chartext",
            characters: ["hamlet-id"],
          }),
          version: 3,
        }),
      );
    });
  });

  describe("createLine happy path", () => {
    it("creates a new line at the beginning", async () => {
      const useCase = new CreateLineUseCase(scriptRepository, userPlaysRepository, playsCollectionRepository, userContext);
      scriptRepository.createLine.mockResolvedValue(
        Result.ok({ lastModifiedDate: new Date("2026-01-15") }),
      );

      const result = await useCase.execute({
        uri: PLAY_URI,
        lineId: "new-line-uuid",
        lineType: "heading",
        position: 0,
      });

      expect(result.isOk()).toBe(true);
      expect(scriptRepository.createLine).toHaveBeenCalledWith({
        scriptId: SCRIPT_ID,
        lineId: "new-line-uuid",
        lineType: "heading",
        position: 0,
      });
    });

    it("creates a line in the middle", async () => {
      const useCase = new CreateLineUseCase(scriptRepository, userPlaysRepository, playsCollectionRepository, userContext);
      scriptRepository.createLine.mockResolvedValue(Result.ok({ lastModifiedDate: new Date() }));

      const result = await useCase.execute({
        uri: PLAY_URI,
        lineId: "mid-line",
        lineType: "freetext",
        position: 10,
      });

      expect(result.isOk()).toBe(true);
      expect(scriptRepository.createLine).toHaveBeenCalledWith(
        expect.objectContaining({ position: 10 }),
      );
    });
  });

  describe("deleteLine happy path", () => {
    it("deletes a line and returns success", async () => {
      const useCase = new DeleteLineUseCase(scriptRepository, userPlaysRepository, playsCollectionRepository, userContext);
      scriptRepository.deleteLine.mockResolvedValue(
        Result.ok({ lastModifiedDate: new Date("2026-01-15") }),
      );

      const result = await useCase.execute({
        uri: PLAY_URI,
        lineId: "line-to-remove",
      });

      expect(result.isOk()).toBe(true);
      expect(scriptRepository.deleteLine).toHaveBeenCalledWith({
        scriptId: SCRIPT_ID,
        lineId: "line-to-remove",
      });
    });
  });

  describe("end-to-end flow", () => {
    it("create line -> save content -> delete line all succeed", async () => {
      const createUseCase = new CreateLineUseCase(scriptRepository, userPlaysRepository, playsCollectionRepository, userContext);
      const saveUseCase = new SaveLineContentUseCase(scriptRepository, userPlaysRepository, playsCollectionRepository, userContext);
      const deleteUseCase = new DeleteLineUseCase(scriptRepository, userPlaysRepository, playsCollectionRepository, userContext);

      const lineId = "e2e-line-1";

      // 1. Create line
      scriptRepository.createLine.mockResolvedValue(Result.ok({ lastModifiedDate: new Date() }));
      const createResult = await createUseCase.execute({
        uri: PLAY_URI,
        lineId,
        lineType: "chartext",
        position: 0,
      });
      expect(createResult.isOk()).toBe(true);

      // 2. Save content
      scriptRepository.saveLineContent.mockResolvedValue(
        Result.ok({ contentId: "e2e-content", lastModifiedDate: new Date() }),
      );
      const saveResult = await saveUseCase.execute({
        uri: PLAY_URI,
        lineId,
        content: {
          lineType: "chartext",
          text: "Hello",
          characters: ["char-1"],
        },
        contentType: "saved_version",
        version: 1,
      });
      expect(saveResult.isOk()).toBe(true);

      // 3. Delete line
      scriptRepository.deleteLine.mockResolvedValue(Result.ok({ lastModifiedDate: new Date() }));
      const deleteResult = await deleteUseCase.execute({
        uri: PLAY_URI,
        lineId,
      });
      expect(deleteResult.isOk()).toBe(true);

      // Verify all repository calls were made with correct script ID
      expect(scriptRepository.createLine).toHaveBeenCalledWith(
        expect.objectContaining({ scriptId: SCRIPT_ID }),
      );
      expect(scriptRepository.saveLineContent).toHaveBeenCalledWith(
        expect.objectContaining({ scriptId: SCRIPT_ID }),
      );
      expect(scriptRepository.deleteLine).toHaveBeenCalledWith(
        expect.objectContaining({ scriptId: SCRIPT_ID }),
      );
    });
  });
});
