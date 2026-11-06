import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@marivo/utils";
import CreatePlayFromCollectionUseCase from "./create-play-from-collection.use-case.ts";
import { CollectionPlayNotFound } from "./plays-collection.repository.ts";
import type { PlaysCollectionRepository } from "./plays-collection.repository.ts";
import type { UserPlaysRepository } from "./user-plays.repository.ts";
import type { ScriptRepository } from "../script/script.repository.ts";
import { ScriptNotFound } from "../script/script.repository.ts";
import type { UserContextService } from "../../shared/use-case.ts";

const userContext = { get: () => ({ userId: 1 }) } as unknown as UserContextService;

describe("CreatePlayFromCollectionUseCase", () => {
  let playsRepository: vi.Mocked<UserPlaysRepository>;
  let collectionRepository: vi.Mocked<PlaysCollectionRepository>;
  let scriptRepository: vi.Mocked<ScriptRepository>;
  let useCase: CreatePlayFromCollectionUseCase;

  beforeEach(() => {
    playsRepository = { createPlay: vi.fn() } as unknown as vi.Mocked<UserPlaysRepository>;
    collectionRepository = {
      getScriptIdByUri: vi.fn(),
    } as unknown as vi.Mocked<PlaysCollectionRepository>;
    scriptRepository = { copyScript: vi.fn() } as unknown as vi.Mocked<ScriptRepository>;
    useCase = new CreatePlayFromCollectionUseCase(
      playsRepository,
      collectionRepository,
      scriptRepository,
      userContext,
    );
  });

  it("creates a play pointing at a COPY of the collection script, not the shared one", async () => {
    collectionRepository.getScriptIdByUri.mockResolvedValue(Result.ok(42));
    scriptRepository.copyScript.mockResolvedValue(Result.ok(777));

    const result = await useCase.execute({
      title: "My new play",
      collectionUri: "99999999-9999-4999-8999-999999999999",
    });

    expect(result.isOk()).toBe(true);
    expect(result.dataOrThrow().uri).toHaveLength(36);
    expect(collectionRepository.getScriptIdByUri).toHaveBeenCalledWith({
      uri: "99999999-9999-4999-8999-999999999999",
    });
    // the script is duplicated first…
    expect(scriptRepository.copyScript).toHaveBeenCalledWith(42, undefined);
    // …and the play points at the copy, never at the collection's script
    expect(playsRepository.createPlay).toHaveBeenCalledOnce();
    const call = vi.mocked(playsRepository.createPlay).mock.calls[0][0];
    expect(call.title).toBe("My new play");
    expect(call.scriptId).toBe(777);
    expect(call.scriptId).not.toBe(42);
    expect(call.uri).toHaveLength(36);
  });

  it("passes lineIdsToKeep through to the script copy", async () => {
    collectionRepository.getScriptIdByUri.mockResolvedValue(Result.ok(42));
    scriptRepository.copyScript.mockResolvedValue(Result.ok(777));
    const keep = ["11111111-1111-4111-8111-111111111111"];

    const result = await useCase.execute({
      title: "Partial play",
      collectionUri: "99999999-9999-4999-8999-999999999999",
      lineIdsToKeep: keep,
    });

    expect(result.isOk()).toBe(true);
    expect(scriptRepository.copyScript).toHaveBeenCalledWith(42, keep);
    expect(vi.mocked(playsRepository.createPlay).mock.calls[0][0].scriptId).toBe(777);
  });

  it("fails without creating a play when the collection uri is unknown", async () => {
    collectionRepository.getScriptIdByUri.mockResolvedValue(
      Result.failure(new CollectionPlayNotFound()),
    );

    const result = await useCase.execute({ title: "X", collectionUri: "nope" });

    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("NOT_FOUND");
    expect(scriptRepository.copyScript).not.toHaveBeenCalled();
    expect(playsRepository.createPlay).not.toHaveBeenCalled();
  });

  it("fails without creating a play when the script copy fails", async () => {
    collectionRepository.getScriptIdByUri.mockResolvedValue(Result.ok(42));
    scriptRepository.copyScript.mockResolvedValue(Result.failure(new ScriptNotFound()));

    const result = await useCase.execute({ title: "X", collectionUri: "some-uri" });

    expect(result.isFailure()).toBe(true);
    expect(playsRepository.createPlay).not.toHaveBeenCalled();
  });
});
