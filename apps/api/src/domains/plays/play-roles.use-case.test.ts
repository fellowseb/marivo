import { describe, it, expect, vi, beforeEach } from "vitest";
import { PLAY_ROLE_PERMISSIONS, Result } from "@marivo/utils";
import {
  AddPlayRoleUseCase,
  RemovePlayRoleUseCase,
  UpdatePlayRolePermissionsUseCase,
} from "./play-roles.use-case.ts";
import {
  PlayAccessForbidden,
  RoleAlreadyExists,
  RoleNotFound,
  type UserPlaysRepository,
} from "./user-plays.repository.ts";
import type { UserContextService } from "../../shared/use-case.ts";

const uri = "550e8400-e29b-41d4-a716-446655440000";

function makeRepo() {
  return {
    checkPlayPermission: vi.fn().mockResolvedValue(Result.ok(undefined)),
    addRole: vi.fn().mockResolvedValue(Result.ok({ id: 7, name: "Stage manager" })),
    removeRole: vi.fn().mockResolvedValue(Result.ok(undefined)),
    updateRolePermissions: vi.fn().mockResolvedValue(Result.ok(undefined)),
  } as unknown as vi.Mocked<UserPlaysRepository>;
}

function ctx(): UserContextService {
  return { get: () => ({ userId: 1 }) } as unknown as UserContextService;
}

describe("AddPlayRoleUseCase", () => {
  let repository: vi.Mocked<UserPlaysRepository>;
  beforeEach(() => {
    repository = makeRepo();
  });

  it("creates the role when the caller has settingsWrite", async () => {
    const result = await new AddPlayRoleUseCase(repository, ctx()).execute({
      uri,
      name: "Stage manager",
    });
    expect(result.isOk()).toBe(true);
    expect(result.dataOrThrow()).toEqual({ id: 7, name: "Stage manager" });
    expect(repository.addRole).toHaveBeenCalledWith({ playUri: uri, name: "Stage manager" });
  });

  it("fails with FORBIDDEN without settingsWrite", async () => {
    repository.checkPlayPermission.mockResolvedValue(Result.failure(new PlayAccessForbidden()));
    const result = await new AddPlayRoleUseCase(repository, ctx()).execute({ uri, name: "X" });
    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("FORBIDDEN");
    expect(repository.addRole).not.toHaveBeenCalled();
  });

  it("surfaces duplicate role names", async () => {
    repository.addRole.mockResolvedValue(Result.failure(new RoleAlreadyExists("viewer")));
    const result = await new AddPlayRoleUseCase(repository, ctx()).execute({ uri, name: "viewer" });
    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("BAD_REQUEST");
  });
});

describe("RemovePlayRoleUseCase", () => {
  let repository: vi.Mocked<UserPlaysRepository>;
  beforeEach(() => {
    repository = makeRepo();
  });

  it("removes a role", async () => {
    const result = await new RemovePlayRoleUseCase(repository, ctx()).execute({
      uri,
      roleName: "Comedian",
    });
    expect(result.isOk()).toBe(true);
    expect(repository.removeRole).toHaveBeenCalledWith({ playUri: uri, roleName: "Comedian" });
  });

  it("rejects removing the builtin owner role", async () => {
    const result = await new RemovePlayRoleUseCase(repository, ctx()).execute({
      uri,
      roleName: "owner",
    });
    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow()).toBeInstanceOf(RoleNotFound);
    expect(repository.removeRole).not.toHaveBeenCalled();
  });
});

describe("UpdatePlayRolePermissionsUseCase", () => {
  let repository: vi.Mocked<UserPlaysRepository>;
  beforeEach(() => {
    repository = makeRepo();
  });

  it("updates the role permissions", async () => {
    const permissions = { ...PLAY_ROLE_PERMISSIONS.viewer, scriptWrite: true };
    const result = await new UpdatePlayRolePermissionsUseCase(repository, ctx()).execute({
      uri,
      roleName: "viewer",
      permissions,
    });
    expect(result.isOk()).toBe(true);
    expect(repository.updateRolePermissions).toHaveBeenCalledWith({
      playUri: uri,
      roleName: "viewer",
      permissions,
    });
  });

  it("rejects editing the owner role", async () => {
    const result = await new UpdatePlayRolePermissionsUseCase(repository, ctx()).execute({
      uri,
      roleName: "owner",
      permissions: PLAY_ROLE_PERMISSIONS.guest,
    });
    expect(result.isFailure()).toBe(true);
    expect(repository.updateRolePermissions).not.toHaveBeenCalled();
  });
});
