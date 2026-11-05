import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result, type Role } from "@marivo/utils";
import { UpdateCollectionPlayMetadataUseCase } from "./update-collection-play-metadata.use-case.ts";
import { CollectionPlayNotFound } from "./plays-collection.repository.ts";
import type { PlaysCollectionRepository } from "./plays-collection.repository.ts";
import type { UserContextService } from "../../shared/use-case.ts";

const URI = "10000000-0000-4000-8000-000000000001";
const input = {
  uri: URI,
  title: "Tartuffe",
  author: "Molière",
  lang: "fr" as const,
  numberOfRoles: 9,
  genre: "comedy",
};

function ctx(role?: Role): UserContextService {
  return { get: () => ({ userId: 1, role }) } as unknown as UserContextService;
}

describe("UpdateCollectionPlayMetadataUseCase", () => {
  let repository: vi.Mocked<PlaysCollectionRepository>;

  beforeEach(() => {
    repository = {
      updateMetadata: vi.fn().mockResolvedValue(Result.ok(undefined)),
    } as unknown as vi.Mocked<PlaysCollectionRepository>;
  });

  it.each(["admin", "collection-maintainer"] as const)("updates metadata (role: %s)", async (role) => {
    const result = await new UpdateCollectionPlayMetadataUseCase(repository, ctx(role)).execute(
      input,
    );
    expect(result.isOk()).toBe(true);
    expect(repository.updateMetadata).toHaveBeenCalledWith(input);
  });

  it("returns FORBIDDEN without the capability", async () => {
    const result = await new UpdateCollectionPlayMetadataUseCase(repository, ctx(undefined)).execute(
      input,
    );
    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("FORBIDDEN");
    expect(repository.updateMetadata).not.toHaveBeenCalled();
  });

  it("propagates NOT_FOUND", async () => {
    repository.updateMetadata.mockResolvedValue(Result.failure(new CollectionPlayNotFound()));
    const result = await new UpdateCollectionPlayMetadataUseCase(
      repository,
      ctx("admin"),
    ).execute(input);
    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("NOT_FOUND");
  });
});
