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
import { SetActiveStagePlanUseCase } from "./set-active-stage-plan.use-case.ts";
import { DuplicateStagePlanUseCase } from "./duplicate-stage-plan.use-case.ts";

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
      collectionStagePlanId: 1,
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
      setActive: new SetActiveStagePlanUseCase(stagePlanRepository, userPlaysRepository, ctx),
      duplicate: new DuplicateStagePlanUseCase(stagePlanRepository, userPlaysRepository, ctx),
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

  it("setActiveStagePlan keeps exactly one active plan per play", async () => {
    const owner = makeUseCases(ownerId);
    await owner.save.execute({
      uri: playUri,
      name: "rehearsal",
      state: sampleState,
      version: 1,
    });
    const set1 = await owner.setActive.execute({ uri: playUri, name: "default" });
    expect(set1.isOk()).toBe(true);
    await owner.setActive.execute({ uri: playUri, name: "rehearsal" });

    const list = await owner.list.execute({ uri: playUri });
    const active = list.dataOrThrow().plans.filter((p) => p.isActive);
    expect(active).toHaveLength(1);
    expect(active[0].name).toBe("rehearsal");

    // getStagePlan without name returns the active one
    const got = await owner.get.execute({ uri: playUri });
    expect(got.dataOrThrow().plan.name).toBe("rehearsal");
  });

  it("duplicateStagePlan copies the plan and its cues, rescaled to the new stage", async () => {
    const owner = makeUseCases(ownerId);
    // add a cue to the "default" plan (12000x8000)
    const [planRow] = await sql<{ id: number }[]>`
      SELECT stage_plans.id FROM stage_plans
      JOIN plays ON plays.id = stage_plans.play_id
      WHERE plays.uri = ${playUri} AND stage_plans.name = 'default'
    `;
    await sql`
      INSERT INTO blocking_cues
        (stage_plan_id, track_id, element_id, kind, start_ms, duration_ms, data, editable)
      VALUES (
        ${planRow.id}, 'movements', 'c1', 'movement', 0, 2000,
        ${JSON.stringify({
          elementId: "c1",
          targetPos: { xMm: 9000, yMm: 3000, rotationDeg: 90 },
          motion: {
            type: "bezierPath",
            c1: { xMm: 5000, yMm: 1000 },
            c2: { xMm: 8000, yMm: 5500 },
          },
        })}::jsonb,
        true
      )
    `;

    const res = await owner.duplicate.execute({
      uri: playUri,
      name: "default",
      newName: "show-6000x4000",
      stageLabel: "Théâtre du Soleil",
      newCollectionStagePlanId: 2,
      newDimensionsMm: { width: 6000, height: 4000 },
    });
    expect(res.isOk()).toBe(true);
    const { plan, copiedCues } = res.dataOrThrow();
    expect(plan.name).toBe("show-6000x4000");
    expect(plan.version).toBe(1);
    expect(plan.isActive).toBe(false);
    expect(plan.stageLabel).toBe("Théâtre du Soleil");
    expect(copiedCues).toBe(1);

    const got = await owner.get.execute({ uri: playUri, name: "show-6000x4000" });
    const newState = got.dataOrThrow().plan.state;
    expect(newState.plan.dimensionsMm).toEqual({ width: 6000, height: 4000 });
    expect(newState.plan.collectionStagePlanId).toBe(2);
    // element c1 at (4200, 5100) -> (2100, 2550)
    expect(newState.elements[0]).toMatchObject({ xMm: 2100, yMm: 2550 });

    const [newPlanRow] = await sql<{ id: number }[]>`
      SELECT stage_plans.id FROM stage_plans
      JOIN plays ON plays.id = stage_plans.play_id
      WHERE plays.uri = ${playUri} AND stage_plans.name = 'show-6000x4000'
    `;
    const cueRows = await sql<{ data: unknown }[]>`
      SELECT data FROM blocking_cues WHERE stage_plan_id = ${newPlanRow.id}
    `;
    expect(cueRows).toHaveLength(1);
    const rawCueData =
      typeof cueRows[0].data === "string" ? JSON.parse(cueRows[0].data) : cueRows[0].data;
    const cueData = rawCueData as {
      targetPos: { xMm: number; yMm: number };
      motion: { c1: { xMm: number }; c2: { xMm: number } };
    };
    expect(cueData.targetPos.xMm).toBe(4500); // 9000 * 0.5
    expect(cueData.targetPos.yMm).toBe(1500); // 3000 * 0.5
    expect(cueData.motion.c1.xMm).toBe(2500); // 5000 * 0.5

    // duplicate with an existing name fails
    const dup = await owner.duplicate.execute({
      uri: playUri,
      name: "default",
      newName: "show-6000x4000",
    });
    expect(dup.isFailure()).toBe(true);
    expect(dup.errorOrThrow().code).toBe("BAD_REQUEST");
  });

  it("viewer gets FORBIDDEN on setActive and duplicate", async () => {
    const viewer = makeUseCases(viewerId);
    const setActive = await viewer.setActive.execute({ uri: playUri, name: "default" });
    expect(setActive.isFailure()).toBe(true);
    expect(setActive.errorOrThrow().code).toBe("FORBIDDEN");
    const dup = await viewer.duplicate.execute({ uri: playUri, name: "default", newName: "x" });
    expect(dup.isFailure()).toBe(true);
    expect(dup.errorOrThrow().code).toBe("FORBIDDEN");
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
