import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@marivo/utils";
import { ToggleBookmarkUseCase } from "./toggle-bookmark.use-case.ts";
import { CollectionPlayNotFound } from "./plays-collection.repository.ts";
import type { PlaysCollectionRepository } from "./plays-collection.repository.ts";
import type { UserContextService } from "../../shared/use-case.ts";

const userContext = { get: () => ({ userId: 1 }) } as unknown as UserContextService;

describe("ToggleBookmarkUseCase", () => {
  let repository: vi.Mocked<PlaysCollectionRepository>;
  let useCase: ToggleBookmarkUseCase;

  beforeEach(() => {
    repository = {
      toggleBookmark: vi.fn(),
    } as unknown as vi.Mocked<PlaysCollectionRepository>;
    useCase = new ToggleBookmarkUseCase(repository, userContext);
  });

  it("returns the new bookmark state", async () => {
    repository.toggleBookmark.mockResolvedValue(Result.ok({ bookmarked: true }));

    const result = await useCase.execute({ playUri: "99999999-9999-4999-8999-999999999999" });

    expect(result.isOk()).toBe(true);
    expect(result.dataOrThrow()).toEqual({ bookmarked: true });
    expect(repository.toggleBookmark).toHaveBeenCalledWith({
      playUri: "99999999-9999-4999-8999-999999999999",
    });
  });

  it("propagates CollectionPlayNotFound", async () => {
    repository.toggleBookmark.mockResolvedValue(Result.failure(new CollectionPlayNotFound()));

    const result = await useCase.execute({ playUri: "nope" });

    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("NOT_FOUND");
  });
});
