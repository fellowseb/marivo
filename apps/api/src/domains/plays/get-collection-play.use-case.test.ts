import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@marivo/utils";
import { GetCollectionPlayUseCase } from "./get-collection-play.use-case.ts";
import { CollectionPlayNotFound } from "./plays-collection.repository.ts";
import type { PlaysCollectionRepository } from "./plays-collection.repository.ts";
import type { UserContextService } from "../../shared/use-case.ts";

const URI = "10000000-0000-4000-8000-000000000001";

const userContext = { get: () => ({ userId: 1 }) } as unknown as UserContextService;

describe("GetCollectionPlayUseCase", () => {
  let repository: vi.Mocked<PlaysCollectionRepository>;
  let useCase: GetCollectionPlayUseCase;

  beforeEach(() => {
    repository = {
      findByUri: vi.fn(),
    } as unknown as vi.Mocked<PlaysCollectionRepository>;
    useCase = new GetCollectionPlayUseCase(repository, userContext);
  });

  it("returns the play details", async () => {
    repository.findByUri.mockResolvedValue(
      Result.ok({ uri: URI, title: "Tartuffe", author: "Molière" }),
    );
    const result = await useCase.execute({ uri: URI });
    expect(result.isOk()).toBe(true);
    expect(result.dataOrThrow()).toEqual({ uri: URI, title: "Tartuffe", author: "Molière" });
  });

  it("propagates NOT_FOUND for unknown uris", async () => {
    repository.findByUri.mockResolvedValue(Result.failure(new CollectionPlayNotFound()));
    const result = await useCase.execute({ uri: URI });
    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("NOT_FOUND");
  });
});
