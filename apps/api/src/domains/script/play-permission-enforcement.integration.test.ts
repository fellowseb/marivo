import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Sql } from "postgres";
import { setupTestDatabase, teardownTestDatabase } from "../../test-utils/db.ts";
import { UserPlaysRepository } from "../plays/user-plays.repository.ts";
import { ScriptRepository } from "./script.repository.ts";
import { LatestScriptChangesUseCase } from "./latest-script-changes.use-case.ts";
import { SaveLineContentUseCase } from "./save-line-content.use-case.ts";
import { ScriptImportsRepository } from "../plays/script-imports.repository.ts";
import { PlaysCollectionRepository } from "../plays/plays-collection.repository.ts";
import type { UserContextService } from "../../shared/use-case.ts";

/**
 * Integration tests (real Postgres) proving play-scoped permissions are
 * enforced server-side on script reads/writes, not just in the UI.
 */
describe("play-scoped permission enforcement on script routes (real Postgres)", () => {
  let sql: Sql;
  let ownerId: number;
  let viewerId: number;
  let playUri: string;
  let scriptId: number;

  function ctxFor(userId: number): UserContextService {
    return { get: () => ({ userId }) } as unknown as UserContextService;
  }

  function makeDeps(userId: number) {
    const ctx = ctxFor(userId);
    return {
      ctx,
      userPlaysRepository: new UserPlaysRepository(sql, ctx),
      scriptRepository: new ScriptRepository(sql, ctx),
      scriptImportsRepository: new ScriptImportsRepository(sql, ctx),
      playsCollectionRepository: new PlaysCollectionRepository(sql, ctx),
    };
  }

  beforeAll(async () => {
    sql = await setupTestDatabase();
    const [owner] = await sql<{ id: number }[]>`
      INSERT INTO users (clerk_id, username, full_name, primary_email)
      VALUES ('it_enf_owner', 'enfowner', 'Enf Owner', 'enfowner@example.com')
      RETURNING id
    `;
    ownerId = owner.id;
    const [viewer] = await sql<{ id: number }[]>`
      INSERT INTO users (clerk_id, username, full_name, primary_email)
      VALUES ('it_enf_viewer', 'enfviewer', 'Enf Viewer', 'enfviewer@example.com')
      RETURNING id
    `;
    viewerId = viewer.id;

    const { userPlaysRepository: ownerRepo } = makeDeps(ownerId);
    playUri = "10000000-0000-4000-8000-00000000enf1";
    const [script] = await sql<{ id: number }[]>`
      INSERT INTO scripts (checksum, characters, lines_order)
      VALUES ('enfchecksum', '{}'::jsonb, ARRAY[gen_random_uuid()])
      RETURNING id
    `;
    scriptId = script.id;
    await ownerRepo.createPlay({ title: "Enforcement play", uri: playUri, scriptId });
    const [playRow] = await sql<{ id: number }[]>`SELECT id FROM plays WHERE uri = ${playUri}`;
    const [viewerRole] = await sql<{ id: number }[]>`
      SELECT id FROM roles WHERE play_id = ${playRow.id} AND name = 'viewer'
    `;
    await sql`
      INSERT INTO users_in_plays (user_id, play_id, role_id)
      VALUES (${viewerId}, ${playRow.id}, ${viewerRole.id})
    `;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it("viewer can read the script (scriptRead) but cannot write (scriptWrite)", async () => {
    const viewerDeps = makeDeps(viewerId);
    const read = await new LatestScriptChangesUseCase(
      viewerDeps.scriptRepository,
      viewerDeps.userPlaysRepository,
      viewerDeps.scriptImportsRepository,
      viewerDeps.playsCollectionRepository,
    ).execute({ uri: playUri, from: "play", since: new Date(0) });
    expect(read.isOk()).toBe(true);

    const write = await new SaveLineContentUseCase(
      viewerDeps.scriptRepository,
      viewerDeps.userPlaysRepository,
      viewerDeps.playsCollectionRepository,
      viewerDeps.ctx,
    ).execute({
      uri: playUri,
      from: "play",
      lineId: "00000000-0000-4000-8000-000000000001",
      contentType: "draft",
      content: { lineType: "freetext", text: "nope" },
    });
    expect(write.isFailure()).toBe(true);
    expect(write.errorOrThrow().code).toBe("FORBIDDEN");
  });

  it("a user who is not a participant at all gets NOT_FOUND on read", async () => {
    const [stranger] = await sql<{ id: number }[]>`
      INSERT INTO users (clerk_id, username, full_name, primary_email)
      VALUES ('it_enf_stranger', 'enfstranger', 'Enf Stranger', 'enfstranger@example.com')
      RETURNING id
    `;
    const strangerDeps = makeDeps(stranger.id);
    const read = await new LatestScriptChangesUseCase(
      strangerDeps.scriptRepository,
      strangerDeps.userPlaysRepository,
      strangerDeps.scriptImportsRepository,
      strangerDeps.playsCollectionRepository,
    ).execute({ uri: playUri, from: "play", since: new Date(0) });
    expect(read.isFailure()).toBe(true);
    expect(read.errorOrThrow().code).toBe("NOT_FOUND");
  });

  it("owner can read and write", async () => {
    const ownerDeps = makeDeps(ownerId);
    const read = await new LatestScriptChangesUseCase(
      ownerDeps.scriptRepository,
      ownerDeps.userPlaysRepository,
      ownerDeps.scriptImportsRepository,
      ownerDeps.playsCollectionRepository,
    ).execute({ uri: playUri, from: "play", since: new Date(0) });
    expect(read.isOk()).toBe(true);

    const write = await new SaveLineContentUseCase(
      ownerDeps.scriptRepository,
      ownerDeps.userPlaysRepository,
      ownerDeps.playsCollectionRepository,
      ownerDeps.ctx,
    ).execute({
      uri: playUri,
      from: "play",
      lineId: "00000000-0000-4000-8000-000000000001",
      contentType: "draft",
      content: { lineType: "freetext", text: "a line" },
    });
    expect(write.isOk()).toBe(true);
  });
});
