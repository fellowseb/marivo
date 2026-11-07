import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Sql } from "postgres";
import { setupTestDatabase, teardownTestDatabase } from "../../test-utils/db.ts";
import { PlayAccessForbidden, UserPlaysRepository } from "./user-plays.repository.ts";
import { SetParticipantRoleUseCase } from "./set-participant-role.use-case.ts";
import {
  AddPlayRoleUseCase,
  RemovePlayRoleUseCase,
  UpdatePlayRolePermissionsUseCase,
} from "./play-roles.use-case.ts";
import { PLAY_ROLE_PERMISSIONS } from "@marivo/utils";
import { PlayDetailsUseCase } from "./play-details.use-case.ts";
import type { UserContextService } from "../../shared/use-case.ts";

/**
 * Integration tests (real Postgres via testcontainers) for in-play RBAC:
 * standard roles seeded at play creation, role assignment by the owner,
 * permission resolution through the role matrix, and the settingsWrite guard.
 */
describe("setParticipantRole + role matrix (integration with real Postgres)", () => {
  let sql: Sql;
  let ownerId: number;
  let participantId: number;
  let playUri: string;

  function ctxFor(userId: number): UserContextService {
    return { get: () => ({ userId }) } as unknown as UserContextService;
  }

  function makeRepos(userId: number) {
    const ctx = ctxFor(userId);
    const repository = new UserPlaysRepository(sql, ctx);
    return { ctx, repository };
  }

  beforeAll(async () => {
    sql = await setupTestDatabase();
    const [owner] = await sql<{ id: number }[]>`
      INSERT INTO users (clerk_id, username, full_name, primary_email)
      VALUES ('it_rbac_owner', 'owner1', 'Owner One', 'owner1@example.com')
      RETURNING id
    `;
    ownerId = owner.id;
    const [participant] = await sql<{ id: number }[]>`
      INSERT INTO users (clerk_id, username, full_name, primary_email)
      VALUES ('it_rbac_part', 'participant1', 'Participant One', 'part1@example.com')
      RETURNING id
    `;
    participantId = participant.id;

    // create the play through the repository so standard roles are seeded
    const { repository: ownerRepo } = makeRepos(ownerId);
    playUri = "10000000-0000-4000-8000-00000000rbac";
    const [script] = await sql<{ id: number }[]>`
      INSERT INTO scripts (checksum, characters, lines_order)
      VALUES ('rbacchecksum', '{}'::jsonb, ARRAY[gen_random_uuid()])
      RETURNING id
    `;
    await ownerRepo.createPlay({ title: "RBAC play", uri: playUri, scriptId: script.id });

    // participant joins with the seeded "viewer" role
    const [viewerRole] = await sql<{ id: number }[]>`
      SELECT id FROM roles WHERE play_id = (SELECT id FROM plays WHERE uri = ${playUri}) AND name = 'viewer'
    `;
    await makeRepos(participantId).repository.joinPlay({
      playId: (await sql<{ id: number }[]>`SELECT id FROM plays WHERE uri = ${playUri}`)[0].id,
      roleId: viewerRole.id,
    });
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it("seeds the standard assignable roles at play creation", async () => {
    const roles = await sql<{ name: string }[]>`
      SELECT name FROM roles
      WHERE play_id = (SELECT id FROM plays WHERE uri = ${playUri})
      ORDER BY name
    `;
    const names = roles.map((r) => r.name);
    expect(names).toContain("admin");
    expect(names).toContain("editor");
    expect(names).toContain("viewer");
    expect(names).toContain("guest");
  });

  it("participant permissions resolve from the role matrix (viewer)", async () => {
    const { repository } = makeRepos(participantId);
    const result = await new PlayDetailsUseCase(repository, ctxFor(participantId)).execute({
      uri: playUri,
    });
    expect(result.isOk()).toBe(true);
    const { permissions, participants } = result.dataOrThrow();
    expect(permissions.scriptRead).toBe(true);
    expect(permissions.scriptWrite).toBe(false);
    expect(permissions.settingsRead).toBe(true);
    expect(permissions.settingsWrite).toBe(false);
    expect(participants["participant1"].role).toBe("viewer");
    expect(participants["owner1"].role).toBe("owner");
  });

  it("owner can assign a new role and the participant's permissions follow the matrix", async () => {
    const { repository: ownerRepo, ctx: ownerCtx } = makeRepos(ownerId);
    const setResult = await new SetParticipantRoleUseCase(ownerRepo, ownerCtx).execute({
      uri: playUri,
      username: "participant1",
      role: "editor",
    });
    expect(setResult.isOk()).toBe(true);

    const { repository: partRepo } = makeRepos(participantId);
    const details = await new PlayDetailsUseCase(partRepo, ctxFor(participantId)).execute({
      uri: playUri,
    });
    const { permissions, participants } = details.dataOrThrow();
    expect(participants["participant1"].role).toBe("editor");
    expect(permissions.scriptWrite).toBe(true);
    expect(permissions.settingsWrite).toBe(false);
  });

  it("a participant without settingsWrite cannot assign roles", async () => {
    const { repository: partRepo, ctx: partCtx } = makeRepos(participantId);
    const result = await new SetParticipantRoleUseCase(partRepo, partCtx).execute({
      uri: playUri,
      username: "participant1",
      role: "admin",
    });
    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow()).toBeInstanceOf(PlayAccessForbidden);
    expect(result.errorOrThrow().code).toBe("FORBIDDEN");
  });

  it("assigning a role to a user who is not a participant fails with NOT_FOUND", async () => {
    const { repository: ownerRepo, ctx: ownerCtx } = makeRepos(ownerId);
    const result = await new SetParticipantRoleUseCase(ownerRepo, ownerCtx).execute({
      uri: playUri,
      username: "ghost",
      role: "viewer",
    });
    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("NOT_FOUND");
  });

  it("playDetails lists the roles: builtin owner first, then the play's roles", async () => {
    const { repository: ownerRepo } = makeRepos(ownerId);
    const details = await new PlayDetailsUseCase(ownerRepo, ctxFor(ownerId)).execute({
      uri: playUri,
    });
    const roles = details.dataOrThrow().roles;
    expect(roles[0]).toMatchObject({ name: "owner", builtin: true });
    expect(roles[0].permissions.scriptWrite).toBe(true);
    expect(roles.slice(1).map((r) => r.name)).toEqual(
      expect.arrayContaining(["admin", "editor", "viewer", "guest"]),
    );
  });

  it("owner can add a role, edit its permissions, and the participant's permissions follow", async () => {
    const { repository: ownerRepo, ctx: ownerCtx } = makeRepos(ownerId);
    const addResult = await new AddPlayRoleUseCase(ownerRepo, ownerCtx).execute({
      uri: playUri,
      name: "Stage manager",
    });
    expect(addResult.isOk()).toBe(true);

    const custom = { ...PLAY_ROLE_PERMISSIONS.guest, stagingNotesWrite: true };
    const updateResult = await new UpdatePlayRolePermissionsUseCase(ownerRepo, ownerCtx).execute({
      uri: playUri,
      roleName: "Stage manager",
      permissions: custom,
    });
    expect(updateResult.isOk()).toBe(true);

    // assign it to the participant and check resolution
    await new SetParticipantRoleUseCase(ownerRepo, ownerCtx).execute({
      uri: playUri,
      username: "participant1",
      role: "Stage manager",
    });
    const { repository: partRepo } = makeRepos(participantId);
    const details = await new PlayDetailsUseCase(partRepo, ctxFor(participantId)).execute({
      uri: playUri,
    });
    const { permissions, participants } = details.dataOrThrow();
    expect(participants["participant1"].role).toBe("Stage manager");
    expect(permissions.stagingNotesWrite).toBe(true);
    expect(permissions.scriptWrite).toBe(false);
  });

  it("adding a duplicate role name fails with BAD_REQUEST", async () => {
    const { repository: ownerRepo, ctx: ownerCtx } = makeRepos(ownerId);
    const result = await new AddPlayRoleUseCase(ownerRepo, ownerCtx).execute({
      uri: playUri,
      name: "viewer",
    });
    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("BAD_REQUEST");
  });

  it("owner can remove a role; participants holding it fall back to no role", async () => {
    const { repository: ownerRepo, ctx: ownerCtx } = makeRepos(ownerId);
    // participant currently holds "Stage manager" from the previous test
    const removeResult = await new RemovePlayRoleUseCase(ownerRepo, ownerCtx).execute({
      uri: playUri,
      roleName: "Stage manager",
    });
    expect(removeResult.isOk()).toBe(true);

    const [row] = await sql<{ role_id: number | null }[]>`
      SELECT uip.role_id FROM users_in_plays uip
      JOIN users u ON u.id = uip.user_id
      JOIN plays p ON p.id = uip.play_id
      WHERE p.uri = ${playUri} AND u.id = ${participantId}
    `;
    expect(row.role_id).toBeNull();
  });

  it("removing the builtin owner role is rejected", async () => {
    const { repository: ownerRepo, ctx: ownerCtx } = makeRepos(ownerId);
    const result = await new RemovePlayRoleUseCase(ownerRepo, ownerCtx).execute({
      uri: playUri,
      roleName: "owner",
    });
    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("NOT_FOUND");
  });

  it("a participant without settingsWrite cannot manage roles", async () => {
    const { repository: partRepo, ctx: partCtx } = makeRepos(participantId);
    const addResult = await new AddPlayRoleUseCase(partRepo, partCtx).execute({
      uri: playUri,
      name: "Hacker",
    });
    expect(addResult.isFailure()).toBe(true);
    expect(addResult.errorOrThrow().code).toBe("FORBIDDEN");

    const updateResult = await new UpdatePlayRolePermissionsUseCase(partRepo, partCtx).execute({
      uri: playUri,
      roleName: "viewer",
      permissions: PLAY_ROLE_PERMISSIONS.admin,
    });
    expect(updateResult.isFailure()).toBe(true);
    expect(updateResult.errorOrThrow().code).toBe("FORBIDDEN");
  });
});
