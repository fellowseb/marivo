import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Sql } from "postgres";
import { setupTestDatabase, teardownTestDatabase } from "../../test-utils/db.ts";
import { UserPlaysRepository } from "../plays/user-plays.repository.ts";
import type { UserContextService } from "../../shared/use-case.ts";
import { StagePlanRepository } from "./stage-plan.repository.ts";
import type { StagePlanState } from "./blocking.models.ts";
import { GetStagePlanUseCase } from "./get-stage-plan.use-case.ts";
import { ListStagePlansUseCase } from "./list-stage-plans.use-case.ts";
import { SaveStagePlanUseCase } from "./save-stage-plan.use-case.ts";

/**
 * Integration tests (real Postgres) for blocking stage-plan persistence (#208):
 * happy paths, LWW version conflicts, and server-side RBAC enforcement
 * (viewer with blockingRead gets 403 on save, non-participant gets 404).
 */
describe("blocking stage plans (real Postgres)", () => {
  let sql: Sql;
  let ownerId: number;
  let viewerId: number;
  let outsiderId: number;
  let playUri: string;

  const sampleState: StagePlanState = {
    schemaVersion: 1,
    plan: {
      libraryPlanId: "builtin:proscenium-12000x8000",
      name: "Proscenium 12x8 m",
      dimensionsMm: { width: 12000, height: 8000 },
      background: {
        locked: true,
        elements: [
          {
            id: "bg-wall",
            semantics: { type: "wall" },
            geometry: { kind: "rect", xMm: 0, yMm: 0, widthMm: 12000, heightMm: 400 },
          },
        ],
      },
    },
    elements: [
      {
        id: "c1",
        kind: "character",
        refId: "c1",
        label: "DORANTE",
        xMm: 4200,
        yMm: 5100,
        layer: "characters",
      },
    ],
  };

  function ctxFor(userId: number): UserContextService {
    return { get: () => ({ userId }) } as unknown as UserContextService;
  }

  function makeUseCases(userId: number) {
    const ctx = ctxFor(userId);
    const stagePlanRepository = new StagePlanRepository(sql, ctx);
    const userPlaysRepository = new UserPlaysRepository(sql, ctx);
    return {
      get: new GetStagePlanUseCase(stagePlanRepository, userPlaysRepository, ctx),
      list: new ListStagePlansUseCase(stagePlanRepository, userPlaysRepository, ctx),
      save: new SaveStagePlanUseCase(stagePlanRepository, userPlaysRepository, ctx),
    };
  }

  beforeAll(async () => {
    sql = await setupTestDatabase();
    const [owner] = await sql<{ id: number }[]>`
      INSERT INTO users (clerk_id, username, full_name, primary_email)
      VALUES ('it_blk_owner', 'blkowner', 'Blk Owner', 'blkowner@example.com')
      RETURNING id
    `;
    ownerId = owner.id;
    const [viewer] = await sql<{ id: number }[]>`
      INSERT INTO users (clerk_id, username, full_name, primary_email)
      VALUES ('it_blk_viewer', 'blkviewer', 'Blk Viewer', 'blkviewer@example.com')
      RETURNING id
    `;
    viewerId = viewer.id;
    const [outsider] = await sql<{ id: number }[]>`
      INSERT INTO users (clerk_id, username, full_name, primary_email)
      VALUES ('it_blk_outsider', 'blkoutsider', 'Blk Outsider', 'blkoutsider@example.com')
      RETURNING id
    `;
    outsiderId = outsider.id;

    playUri = "20000000-0000-4000-8000-00000000blk1";
    const [script] = await sql<{ id: number }[]>`
      INSERT INTO scripts (checksum, characters, lines_order)
      VALUES ('blkchecksum', '{}'::jsonb, ARRAY[gen_random_uuid()])
      RETURNING id
    `;
    const ownerRepo = new UserPlaysRepository(sql, ctxFor(ownerId));
    await ownerRepo.createPlay({ title: "Blocking play", uri: playUri, scriptId: script.id });
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

  it("owner can save, get and list a stage plan (LWW versions)", async () => {
    const owner = makeUseCases(ownerId);

    const saved1 = await owner.save.execute({
      uri: playUri,
      name: "default",
      state: sampleState,
      version: 1,
    });
    expect(saved1.isOk()).toBe(true);
    expect(saved1.dataOrThrow().version).toBe(1);

    // second save with the matching version bumps it
    const saved2 = await owner.save.execute({
      uri: playUri,
      name: "default",
      state: sampleState,
      version: 1,
    });
    expect(saved2.isOk()).toBe(true);
    expect(saved2.dataOrThrow().version).toBe(2);

    const got = await owner.get.execute({ uri: playUri, name: "default" });
    expect(got.isOk()).toBe(true);
    const plan = got.dataOrThrow().plan;
    expect(plan.version).toBe(2);
    expect(plan.state.plan.dimensionsMm).toEqual({ width: 12000, height: 8000 });
    expect(plan.state.elements[0]).toMatchObject({ id: "c1", xMm: 4200, yMm: 5100 });

    const list = await owner.list.execute({ uri: playUri });
    expect(list.isOk()).toBe(true);
    expect(list.dataOrThrow().plans.map((p) => p.name)).toEqual(["default"]);
  });

  it("rejects a save with a stale version (LWW conflict)", async () => {
    const owner = makeUseCases(ownerId);
    // current stored version is 2 after the previous test; sending 1 conflicts
    const res = await owner.save.execute({
      uri: playUri,
      name: "default",
      state: sampleState,
      version: 1,
    });
    expect(res.isFailure()).toBe(true);
    expect(res.errorOrThrow().code).toBe("BAD_REQUEST");
    expect(res.errorOrThrow().message).toContain("modified by someone else");
  });

  it("rejects a save for a plan name that does not exist with a non-1 version", async () => {
    const owner = makeUseCases(ownerId);
    const res = await owner.save.execute({
      uri: playUri,
      name: "never-created",
      state: sampleState,
      version: 5,
    });
    expect(res.isFailure()).toBe(true);
    expect(res.errorOrThrow().message).toContain("modified by someone else");
  });

  it("viewer (blockingRead only) can read but gets FORBIDDEN on save", async () => {
    const viewer = makeUseCases(viewerId);
    const got = await viewer.get.execute({ uri: playUri });
    expect(got.isOk()).toBe(true);

    const list = await viewer.list.execute({ uri: playUri });
    expect(list.isOk()).toBe(true);

    const save = await viewer.save.execute({
      uri: playUri,
      name: "default",
      state: sampleState,
      version: 2,
    });
    expect(save.isFailure()).toBe(true);
    expect(save.errorOrThrow().code).toBe("FORBIDDEN");
  });

  it("non-participant gets NOT_FOUND on both read and write", async () => {
    const outsider = makeUseCases(outsiderId);
    const got = await outsider.get.execute({ uri: playUri });
    expect(got.isFailure()).toBe(true);
    expect(got.errorOrThrow().code).toBe("NOT_FOUND");

    const save = await outsider.save.execute({
      uri: playUri,
      name: "default",
      state: sampleState,
      version: 2,
    });
    expect(save.isFailure()).toBe(true);
    expect(save.errorOrThrow().code).toBe("NOT_FOUND");
  });

  it("deleting the play cascades to its stage plans", async () => {
    const cascadeUri = "20000000-0000-4000-8000-00000000blk2";
    const [script] = await sql<{ id: number }[]>`
      INSERT INTO scripts (checksum, characters, lines_order)
      VALUES ('blkchecksum2', '{}'::jsonb, ARRAY[gen_random_uuid()])
      RETURNING id
    `;
    const ownerRepo = new UserPlaysRepository(sql, ctxFor(ownerId));
    await ownerRepo.createPlay({ title: "Cascade play", uri: cascadeUri, scriptId: script.id });
    const owner = makeUseCases(ownerId);
    await owner.save.execute({ uri: cascadeUri, name: "default", state: sampleState, version: 1 });

    const [playRow] = await sql<{ id: number }[]>`SELECT id FROM plays WHERE uri = ${cascadeUri}`;
    await sql`DELETE FROM plays WHERE id = ${playRow.id}`;
    const [count] = await sql<{ count: string }[]>`
      SELECT count(*) FROM stage_plans WHERE play_id = ${playRow.id}
    `;
    expect(Number(count.count)).toBe(0);
  });
});
