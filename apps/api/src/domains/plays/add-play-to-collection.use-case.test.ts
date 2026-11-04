import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result, type Role } from "@marivo/utils";
import { AddPlayToCollectionUseCase } from "./add-play-to-collection.use-case.ts";
import { PlayAlreadyInCollection } from "./plays-collection.repository.ts";
import type { PlaysCollectionRepository } from "./plays-collection.repository.ts";
import { PlayNotFound } from "./user-plays.repository.ts";
import type { UserPlaysRepository } from "./user-plays.repository.ts";
import type { UserContextService } from "../../shared/use-case.ts";

const PLAY_URI = "10000000-0000-4000-8000-000000000001";

const input = {
  playUri: PLAY_URI,
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
  let playsRepository: vi.Mocked<UserPlaysRepository>;

  beforeEach(() => {
    collectionRepository = {
      existsByScriptId: vi.fn().mockResolvedValue(Result.ok(false)),
      addToCollection: vi.fn().mockResolvedValue(Result.ok({ uri: "20000000-0000-4000-8000-000000000002" })),
    } as unknown as vi.Mocked<PlaysCollectionRepository>;
    playsRepository = {
      getScriptId: vi.fn().mockResolvedValue(Result.ok(42)),
    } as unknown as vi.Mocked<UserPlaysRepository>;
  });

  it.each(["admin", "collection-maintainer"] as const)(
    "publishes the play's script into the collection (role: %s)",
    async (role) => {
      const useCase = new AddPlayToCollectionUseCase(
        collectionRepository,
        playsRepository,
        makeUserContext(role),
      );

      const result = await useCase.execute(input);

      expect(result.isOk()).toBe(true);
      expect(result.dataOrThrow().uri).toMatch(/^[0-9a-f-]{36}$/);
      expect(playsRepository.getScriptId).toHaveBeenCalledWith({ uri: PLAY_URI });
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
    },
  );

  it("returns FORBIDDEN when the user has no role", async () => {
    const useCase = new AddPlayToCollectionUseCase(
      collectionRepository,
      playsRepository,
      makeUserContext(undefined),
    );

    const result = await useCase.execute(input);

    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("FORBIDDEN");
    expect(playsRepository.getScriptId).not.toHaveBeenCalled();
    expect(collectionRepository.addToCollection).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND when the play does not exist", async () => {
    playsRepository.getScriptId.mockResolvedValue(Result.failure(new PlayNotFound(PLAY_URI)));
    const useCase = new AddPlayToCollectionUseCase(
      collectionRepository,
      playsRepository,
      makeUserContext("admin"),
    );

    const result = await useCase.execute(input);

    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("NOT_FOUND");
    expect(collectionRepository.addToCollection).not.toHaveBeenCalled();
  });

  it("returns BAD_REQUEST when the script is already in the collection", async () => {
    collectionRepository.existsByScriptId.mockResolvedValue(Result.ok(true));
    const useCase = new AddPlayToCollectionUseCase(
      collectionRepository,
      playsRepository,
      makeUserContext("collection-maintainer"),
    );

    const result = await useCase.execute(input);

    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow()).toBeInstanceOf(PlayAlreadyInCollection);
    expect(result.errorOrThrow().code).toBe("BAD_REQUEST");
    expect(collectionRepository.addToCollection).not.toHaveBeenCalled();
  });
});
