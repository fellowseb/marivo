import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result, type Role } from "@marivo/utils";
import { DeleteCollectionPlayUseCase } from "./delete-collection-play.use-case.ts";
import { CollectionPlayNotFound } from "./plays-collection.repository.ts";
import type { PlaysCollectionRepository } from "./plays-collection.repository.ts";
import type { UserContextService } from "../../shared/use-case.ts";

const URI = "10000000-0000-4000-8000-000000000001";

function ctx(role?: Role): UserContextService {
  return { get: () => ({ userId: 1, role }) } as unknown as UserContextService;
}

describe("DeleteCollectionPlayUseCase", () => {
  let repository: vi.Mocked<PlaysCollectionRepository>;

  beforeEach(() => {
    repository = {
      deleteByUri: vi.fn().mockResolvedValue(Result.ok(undefined)),
    } as unknown as vi.Mocked<PlaysCollectionRepository>;
  });

  it.each(["admin", "collection-maintainer"] as const)(
    "deletes the play (role: %s)",
    async (role) => {
      const result = await new DeleteCollectionPlayUseCase(repository, ctx(role)).execute({
        uri: URI,
      });
      expect(result.isOk()).toBe(true);
      expect(repository.deleteByUri).toHaveBeenCalledWith({ uri: URI });
    },
  );

  it("returns FORBIDDEN without the capability", async () => {
    const result = await new DeleteCollectionPlayUseCase(repository, ctx(undefined)).execute({
      uri: URI,
    });
    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("FORBIDDEN");
    expect(repository.deleteByUri).not.toHaveBeenCalled();
  });

  it("propagates NOT_FOUND", async () => {
    repository.deleteByUri.mockResolvedValue(Result.failure(new CollectionPlayNotFound()));
    const result = await new DeleteCollectionPlayUseCase(repository, ctx("admin")).execute({
      uri: URI,
    });
    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("NOT_FOUND");
  });
});
