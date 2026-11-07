import { describe, it, expect, vi, beforeEach } from "vitest";
import { PLAY_ROLE_PERMISSIONS, Result } from "@marivo/utils";
import { SetParticipantPermissionsUseCase } from "./set-participant-permissions.use-case.ts";
import {
  ParticipantNotFound,
  PlayAccessForbidden,
  type UserPlaysRepository,
} from "./user-plays.repository.ts";
import type { UserContextService } from "../../shared/use-case.ts";

describe("SetParticipantPermissionsUseCase", () => {
  let repository: vi.Mocked<UserPlaysRepository>;
  let useCase: SetParticipantPermissionsUseCase;
  const uri = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    repository = {
      checkPlayPermission: vi.fn().mockResolvedValue(Result.ok(undefined)),
      setParticipantPermissions: vi.fn().mockResolvedValue(Result.ok(undefined)),
    } as unknown as vi.Mocked<UserPlaysRepository>;
    const ctx = { get: () => ({ userId: 1 }) } as unknown as UserContextService;
    useCase = new SetParticipantPermissionsUseCase(repository, ctx);
  });

  it("stores the custom permissions when the caller has settingsWrite", async () => {
    const permissions = { ...PLAY_ROLE_PERMISSIONS.viewer, scriptWrite: true };
    const result = await useCase.execute({ uri, username: "alice", permissions });

    expect(result.isOk()).toBe(true);
    expect(result.dataOrThrow()).toEqual({ uri, username: "alice" });
    expect(repository.checkPlayPermission).toHaveBeenCalledWith({
      uri,
      permission: "settingsWrite",
    });
    expect(repository.setParticipantPermissions).toHaveBeenCalledWith({
      playUri: uri,
      username: "alice",
      permissions,
    });
  });

  it("fails with FORBIDDEN when the caller lacks settingsWrite", async () => {
    repository.checkPlayPermission.mockResolvedValue(Result.failure(new PlayAccessForbidden()));

    const result = await useCase.execute({
      uri,
      username: "alice",
      permissions: PLAY_ROLE_PERMISSIONS.guest,
    });

    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("FORBIDDEN");
    expect(repository.setParticipantPermissions).not.toHaveBeenCalled();
  });

  it("surfaces NOT_FOUND when the participant is not in the play", async () => {
    repository.setParticipantPermissions.mockResolvedValue(
      Result.failure(new ParticipantNotFound("bob")),
    );

    const result = await useCase.execute({
      uri,
      username: "bob",
      permissions: PLAY_ROLE_PERMISSIONS.editor,
    });

    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("NOT_FOUND");
  });
});
