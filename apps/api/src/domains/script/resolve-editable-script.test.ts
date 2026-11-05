import { describe, it, expect, vi } from "vitest";
import { Result, type Role } from "@marivo/utils";
import { resolveEditableScriptId } from "./resolve-editable-script.ts";
import { PlayNotFound } from "../plays/user-plays.repository.ts";
import type { UserPlaysRepository } from "../plays/user-plays.repository.ts";
import { CollectionPlayNotFound } from "../plays/plays-collection.repository.ts";
import type { PlaysCollectionRepository } from "../plays/plays-collection.repository.ts";
import type { AuthenticatedUserContext } from "../../shared/use-case.ts";

const URI = "10000000-0000-4000-8000-000000000001";

function deps(role?: Role) {
  return {
    userPlaysRepository: {
      getScriptId: vi.fn().mockResolvedValue(Result.ok(42)),
    } as unknown as UserPlaysRepository,
    playsCollectionRepository: {
      getScriptIdByUri: vi.fn().mockResolvedValue(Result.ok(43)),
    } as unknown as PlaysCollectionRepository,
    userContext: { userId: 1, role } as AuthenticatedUserContext,
  };
}

describe("resolveEditableScriptId", () => {
  it("resolves play uris via the plays repository (existing behavior)", async () => {
    const d = deps(undefined);
    const result = await resolveEditableScriptId({ uri: URI, from: "play" }, d);
    expect(result.isOk()).toBe(true);
    expect(result.dataOrThrow()).toBe(42);
    expect(d.userPlaysRepository.getScriptId).toHaveBeenCalledWith({ uri: URI });
  });

  it("propagates PlayNotFound for unknown plays", async () => {
    const d = deps(undefined);
    (d.userPlaysRepository.getScriptId as ReturnType<typeof vi.fn>).mockResolvedValue(
      Result.failure(new PlayNotFound(URI)),
    );
    const result = await resolveEditableScriptId({ uri: URI, from: "play" }, d);
    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("NOT_FOUND");
  });

  it.each(["admin", "collection-maintainer"] as const)(
    "resolves collection uris for role %s via the collection repository",
    async (role) => {
      const d = deps(role);
      const result = await resolveEditableScriptId({ uri: URI, from: "collection" }, d);
      expect(result.isOk()).toBe(true);
      expect(result.dataOrThrow()).toBe(43);
      expect(d.playsCollectionRepository.getScriptIdByUri).toHaveBeenCalledWith({ uri: URI });
    },
  );

  it("rejects collection edits without the edit_collection_play_script capability", async () => {
    const d = deps(undefined);
    const result = await resolveEditableScriptId({ uri: URI, from: "collection" }, d);
    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("FORBIDDEN");
    expect(d.playsCollectionRepository.getScriptIdByUri).not.toHaveBeenCalled();
  });

  it("propagates CollectionPlayNotFound for unknown collection plays", async () => {
    const d = deps("admin");
    (d.playsCollectionRepository.getScriptIdByUri as ReturnType<typeof vi.fn>).mockResolvedValue(
      Result.failure(new CollectionPlayNotFound()),
    );
    const result = await resolveEditableScriptId({ uri: URI, from: "collection" }, d);
    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("NOT_FOUND");
  });
});
