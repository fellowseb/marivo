import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result, type Role } from "@marivo/utils";
import { SetCollectionPlayArchivedUseCase } from "./set-collection-play-archived.use-case.ts";
import { CollectionPlayNotFound } from "./plays-collection.repository.ts";
import type { PlaysCollectionRepository } from "./plays-collection.repository.ts";
import type { UserContextService } from "../../shared/use-case.ts";

const URI = "10000000-0000-4000-8000-000000000001";

function ctx(role?: Role): UserContextService {
  return { get: () => ({ userId: 1, role }) } as unknown as UserContextService;
}

describe("SetCollectionPlayArchivedUseCase", () => {
  let repository: vi.Mocked<PlaysCollectionRepository>;

  beforeEach(() => {
    repository = {
      setArchived: vi.fn().mockResolvedValue(Result.ok(undefined)),
    } as unknown as vi.Mocked<PlaysCollectionRepository>;
  });

  it.each(["admin", "collection-maintainer"] as const)(
    "sets archived=true (role: %s)",
    async (role) => {
      const result = await new SetCollectionPlayArchivedUseCase(repository, ctx(role)).execute({
        uri: URI,
        archived: true,
      });
      expect(result.isOk()).toBe(true);
      expect(result.dataOrThrow()).toEqual({ archived: true });
      expect(repository.setArchived).toHaveBeenCalledWith({ uri: URI, archived: true });
    },
  );

  it("returns FORBIDDEN without the capability", async () => {
    const result = await new SetCollectionPlayArchivedUseCase(repository, ctx(undefined)).execute({
      uri: URI,
      archived: true,
    });
    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("FORBIDDEN");
  });

  it("propagates NOT_FOUND", async () => {
    repository.setArchived.mockResolvedValue(Result.failure(new CollectionPlayNotFound()));
    const result = await new SetCollectionPlayArchivedUseCase(repository, ctx("admin")).execute({
      uri: URI,
      archived: false,
    });
    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("NOT_FOUND");
  });
});
