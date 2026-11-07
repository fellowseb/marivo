import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@marivo/utils";
import { SetParticipantRoleUseCase } from "./set-participant-role.use-case.ts";
import {
  ParticipantNotFound,
  PlayAccessForbidden,
  PlayNotFound,
  type UserPlaysRepository,
} from "./user-plays.repository.ts";
import type { UserContextService } from "../../shared/use-case.ts";

describe("SetParticipantRoleUseCase", () => {
  let repository: vi.Mocked<UserPlaysRepository>;
  let useCase: SetParticipantRoleUseCase;
  const uri = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    repository = {
      checkPlayPermission: vi.fn().mockResolvedValue(Result.ok(undefined)),
      setParticipantRole: vi.fn().mockResolvedValue(Result.ok(undefined)),
    } as unknown as vi.Mocked<UserPlaysRepository>;
    const ctx = { get: () => ({ userId: 1 }) } as unknown as UserContextService;
    useCase = new SetParticipantRoleUseCase(repository, ctx);
  });

  it("assigns the role when the caller has settingsWrite", async () => {
    const result = await useCase.execute({ uri, username: "alice", role: "editor" });

    expect(result.isOk()).toBe(true);
    expect(result.dataOrThrow()).toEqual({ uri, username: "alice", role: "editor" });
    expect(repository.checkPlayPermission).toHaveBeenCalledWith({
      uri,
      permission: "settingsWrite",
    });
    expect(repository.setParticipantRole).toHaveBeenCalledWith({
      playUri: uri,
      username: "alice",
      role: "editor",
    });
  });

  it("fails with FORBIDDEN when the caller lacks settingsWrite", async () => {
    repository.checkPlayPermission.mockResolvedValue(Result.failure(new PlayAccessForbidden()));

    const result = await useCase.execute({ uri, username: "alice", role: "viewer" });

    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("FORBIDDEN");
    expect(repository.setParticipantRole).not.toHaveBeenCalled();
  });

  it("surfaces NOT_FOUND when the play does not exist", async () => {
    repository.checkPlayPermission.mockResolvedValue(Result.failure(new PlayNotFound(uri)));

    const result = await useCase.execute({ uri, username: "alice", role: "guest" });

    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("NOT_FOUND");
  });

  it("surfaces NOT_FOUND when the participant is not in the play", async () => {
    repository.setParticipantRole.mockResolvedValue(Result.failure(new ParticipantNotFound("bob")));

    const result = await useCase.execute({ uri, username: "bob", role: "admin" });

    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("NOT_FOUND");
  });
});
