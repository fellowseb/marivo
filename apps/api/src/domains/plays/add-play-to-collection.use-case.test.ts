import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result, type Role } from "@marivo/utils";
import { AddPlayToCollectionUseCase } from "./add-play-to-collection.use-case.ts";
import { PlayAlreadyInCollection } from "./plays-collection.repository.ts";
import type { PlaysCollectionRepository } from "./plays-collection.repository.ts";
import { ScriptImportNotFound } from "./script-imports.repository.ts";
import type { ScriptImportsRepository } from "./script-imports.repository.ts";
import type { UserContextService } from "../../shared/use-case.ts";

const IMPORT_ID = "10000000-0000-4000-8000-000000000001";

const input = {
  importId: IMPORT_ID,
  title: "Tartuffe",
  author: "Molière",
  lang: "fr" as const,
  numberOfRoles: 9,
  numberOfMaleRoles: 6,
  numberOfFemaleRoles: 3,
  genre: "comedy",
  period: "xviiith",
  synopsis: "Un faux dévot s'invite chez Orgon.",
};

function makeUserContext(role?: Role): UserContextService {
  return { get: () => ({ userId: 1, role }) } as unknown as UserContextService;
}

describe("AddPlayToCollectionUseCase", () => {
  let collectionRepository: vi.Mocked<PlaysCollectionRepository>;
  let importsRepository: vi.Mocked<ScriptImportsRepository>;

  beforeEach(() => {
    collectionRepository = {
      existsByScriptId: vi.fn().mockResolvedValue(Result.ok(false)),
      addToCollection: vi
        .fn()
        .mockResolvedValue(Result.ok({ uri: "20000000-0000-4000-8000-000000000002" })),
    } as unknown as vi.Mocked<PlaysCollectionRepository>;
    importsRepository = {
      getResultScriptId: vi.fn().mockResolvedValue(Result.ok(42)),
      setScriptImportDone: vi.fn().mockResolvedValue(undefined),
    } as unknown as vi.Mocked<ScriptImportsRepository>;
  });

  it.each(["admin", "collection-maintainer"] as const)(
    "publishes the import's script into the collection and marks the import done (role: %s)",
    async (role) => {
      const useCase = new AddPlayToCollectionUseCase(
        collectionRepository,
        importsRepository,
        makeUserContext(role),
      );

      const result = await useCase.execute(input);

      expect(result.isOk()).toBe(true);
      expect(result.dataOrThrow().uri).toMatch(/^[0-9a-f-]{36}$/);
      expect(importsRepository.getResultScriptId).toHaveBeenCalledWith({ id: IMPORT_ID });
      expect(collectionRepository.existsByScriptId).toHaveBeenCalledWith(42);
      expect(collectionRepository.addToCollection).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Tartuffe",
          author: "Molière",
          lang: "fr",
          genre: "comedy",
          period: "xviiith",
          synopsis: "Un faux dévot s'invite chez Orgon.",
          scriptId: 42,
        }),
      );
      expect(importsRepository.setScriptImportDone).toHaveBeenCalledWith({ importId: IMPORT_ID });
    },
  );

  it("returns FORBIDDEN when the user has no role", async () => {
    const useCase = new AddPlayToCollectionUseCase(
      collectionRepository,
      importsRepository,
      makeUserContext(undefined),
    );

    const result = await useCase.execute(input);

    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("FORBIDDEN");
    expect(importsRepository.getResultScriptId).not.toHaveBeenCalled();
    expect(collectionRepository.addToCollection).not.toHaveBeenCalled();
  });

  it("returns the ScriptImportNotFound error when the import does not exist", async () => {
    importsRepository.getResultScriptId.mockResolvedValue(
      Result.failure(new ScriptImportNotFound()),
    );
    const useCase = new AddPlayToCollectionUseCase(
      collectionRepository,
      importsRepository,
      makeUserContext("admin"),
    );

    const result = await useCase.execute(input);

    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("BAD_REQUEST");
    expect(collectionRepository.addToCollection).not.toHaveBeenCalled();
  });

  it("returns BAD_REQUEST when the script is already in the collection", async () => {
    collectionRepository.existsByScriptId.mockResolvedValue(Result.ok(true));
    const useCase = new AddPlayToCollectionUseCase(
      collectionRepository,
      importsRepository,
      makeUserContext("collection-maintainer"),
    );

    const result = await useCase.execute(input);

    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow()).toBeInstanceOf(PlayAlreadyInCollection);
    expect(result.errorOrThrow().code).toBe("BAD_REQUEST");
    expect(collectionRepository.addToCollection).not.toHaveBeenCalled();
    expect(importsRepository.setScriptImportDone).not.toHaveBeenCalled();
  });
});
