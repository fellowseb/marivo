import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@marivo/utils";
import CreatePlayFromCollectionUseCase from "./create-play-from-collection.use-case.ts";
import { CollectionPlayNotFound } from "./plays-collection.repository.ts";
import type { PlaysCollectionRepository } from "./plays-collection.repository.ts";
import type { UserPlaysRepository } from "./user-plays.repository.ts";
import type { UserContextService } from "../../shared/use-case.ts";

const userContext = { get: () => ({ userId: 1 }) } as unknown as UserContextService;

describe("CreatePlayFromCollectionUseCase", () => {
  let playsRepository: vi.Mocked<UserPlaysRepository>;
  let collectionRepository: vi.Mocked<PlaysCollectionRepository>;
  let useCase: CreatePlayFromCollectionUseCase;

  beforeEach(() => {
    playsRepository = { createPlay: vi.fn() } as unknown as vi.Mocked<UserPlaysRepository>;
    collectionRepository = {
      getScriptIdByUri: vi.fn(),
    } as unknown as vi.Mocked<PlaysCollectionRepository>;
    useCase = new CreatePlayFromCollectionUseCase(
      playsRepository,
      collectionRepository,
      userContext,
    );
  });

  it("creates a play pointing at the collection script", async () => {
    collectionRepository.getScriptIdByUri.mockResolvedValue(Result.ok(42));

    const result = await useCase.execute({
      title: "My new play",
      collectionUri: "99999999-9999-4999-8999-999999999999",
    });

    expect(result.isOk()).toBe(true);
    expect(result.dataOrThrow().uri).toHaveLength(36);
    expect(collectionRepository.getScriptIdByUri).toHaveBeenCalledWith({
      uri: "99999999-9999-4999-8999-999999999999",
    });
    expect(playsRepository.createPlay).toHaveBeenCalledOnce();
    const call = vi.mocked(playsRepository.createPlay).mock.calls[0][0];
    expect(call.title).toBe("My new play");
    expect(call.scriptId).toBe(42);
    expect(call.uri).toHaveLength(36);
  });

  it("fails without creating a play when the collection uri is unknown", async () => {
    collectionRepository.getScriptIdByUri.mockResolvedValue(
      Result.failure(new CollectionPlayNotFound()),
    );

    const result = await useCase.execute({ title: "X", collectionUri: "nope" });

    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("NOT_FOUND");
    expect(playsRepository.createPlay).not.toHaveBeenCalled();
  });
});
