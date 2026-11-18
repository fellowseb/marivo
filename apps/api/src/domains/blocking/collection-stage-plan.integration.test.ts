import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Sql } from "postgres";
import { setupTestDatabase, teardownTestDatabase } from "../../test-utils/db.ts";
import { UserPlaysRepository } from "../plays/user-plays.repository.ts";
import type { UserContextService } from "../../shared/use-case.ts";
import type { StagePlanState } from "./blocking.models.ts";
import { CollectionStagePlanRepository } from "./collection-stage-plan.repository.ts";
import { StagePlanRepository } from "./stage-plan.repository.ts";
import {
  CreateStageLibraryPlanUseCase,
  DeleteStageLibraryPlanUseCase,
  GetStageLibraryPlanUseCase,
  ListStageLibraryPlansUseCase,
  UpdateStageLibraryPlanUseCase,
} from "./collection-stage-plan.use-cases.ts";
import { DuplicateStagePlanUseCase } from "./duplicate-stage-plan.use-case.ts";

/**
 * Integration tests (real Postgres) for the server-side stage library (#230):
 * capability-gated maintainer CRUD + copy-on-use into a play.
 */
describe("collection stage library (real Postgres)", () => {
  let sql: Sql;
  let maintainerId: number;
  let plainUserId: number;
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
        xMm: 6000,
        yMm: 4000,
        layer: "characters",
      },
    ],
  };

  function ctxFor(userId: number, role?: string): UserContextService {
    return { get: () => ({ userId, role: role as never }) } as unknown as UserContextService;
  }

  function makeUseCases(userId: number, role?: string) {
    const ctx = ctxFor(userId, role);
    const collectionRepo = new CollectionStagePlanRepository(sql, ctx);
    const stagePlanRepo = new StagePlanRepository(sql, ctx);
    const userPlaysRepo = new UserPlaysRepository(sql, ctx);
    return {
      list: new ListStageLibraryPlansUseCase(collectionRepo, ctx),
      get: new GetStageLibraryPlanUseCase(collectionRepo, ctx),
      create: new CreateStageLibraryPlanUseCase(collectionRepo, ctx),
      update: new UpdateStageLibraryPlanUseCase(collectionRepo, ctx),
      delete: new DeleteStageLibraryPlanUseCase(collectionRepo, ctx),
      duplicate: new DuplicateStagePlanUseCase(stagePlanRepo, userPlaysRepo, ctx),
    };
  }

  beforeAll(async () => {
    sql = await setupTestDatabase();
    const [maintainer] = await sql<{ id: number }[]>`
      INSERT INTO users (clerk_id, username, full_name, primary_email)
      VALUES ('it_lib_maint', 'libmaint', 'Lib Maintainer', 'libmaint@example.com')
      RETURNING id
    `;
    maintainerId = maintainer.id;
    const [plain] = await sql<{ id: number }[]>`
      INSERT INTO users (clerk_id, username, full_name, primary_email)
      VALUES ('it_lib_plain', 'libplain', 'Lib Plain', 'libplain@example.com')
      RETURNING id
    `;
    plainUserId = plain.id;

    playUri = "30000000-0000-4000-8000-00000000lib1";
    const [script] = await sql<{ id: number }[]>`
      INSERT INTO scripts (checksum, characters, lines_order)
      VALUES ('libchecksum', '{}'::jsonb, ARRAY[gen_random_uuid()])
      RETURNING id
    `;
    const ownerRepo = new UserPlaysRepository(sql, ctxFor(plainUserId));
    await ownerRepo.createPlay({ title: "Lib play", uri: playUri, scriptId: script.id });
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it("maintainer can create, list, get, update (LWW) and archive a library plan", async () => {
    const maint = makeUseCases(maintainerId, "collection-maintainer");

    const created = await maint.create.execute({
      name: "Proscenium 12x8 m",
      isGeneric: true,
      layoutType: "proscenium",
      state: sampleState,
    });
    expect(created.isOk()).toBe(true);
    const plan = created.dataOrThrow();
    expect(plan.version).toBe(1);
    expect(plan.createdBy).toBe(maintainerId);

    // real theatre entry
    const created2 = await maint.create.execute({
      name: "Théâtre du Soleil",
      isGeneric: false,
      theatreName: "Théâtre du Soleil",
      city: "Paris",
      country: "France",
      state: sampleState,
    });
    expect(created2.isOk()).toBe(true);

    const list = await maint.list.execute({});
    expect(list.dataOrThrow().plans).toHaveLength(2);

    const generics = await maint.list.execute({ genericOnly: true });
    expect(generics.dataOrThrow().plans.map((p) => p.name)).toEqual(["Proscenium 12x8 m"]);

    const searched = await maint.list.execute({ query: "soleil" });
    expect(searched.dataOrThrow().plans.map((p) => p.name)).toEqual(["Théâtre du Soleil"]);

    const updated = await maint.update.execute({
      id: plan.id,
      expectedVersion: 1,
      meta: { name: "Proscenium 12x8 m (updated)" },
    });
    expect(updated.isOk()).toBe(true);
    expect(updated.dataOrThrow().version).toBe(2);
    expect(updated.dataOrThrow().name).toBe("Proscenium 12x8 m (updated)");

    // stale version conflicts
    const conflict = await maint.update.execute({ id: plan.id, expectedVersion: 1 });
    expect(conflict.isFailure()).toBe(true);

    const got = await maint.get.execute({ id: plan.id });
    expect(got.dataOrThrow().state.plan.dimensionsMm).toEqual({ width: 12000, height: 8000 });

    // archive hides it from the default list
    const del = await maint.delete.execute({ id: created2.dataOrThrow().id });
    expect(del.isOk()).toBe(true);
    const listAfter = await maint.list.execute({});
    expect(listAfter.dataOrThrow().plans).toHaveLength(1);
    const withArchived = await maint.list.execute({ includeArchived: true });
    expect(withArchived.dataOrThrow().plans).toHaveLength(2);
  });

  it("plain user can read the library but gets FORBIDDEN on mutations", async () => {
    const plain = makeUseCases(plainUserId);
    const list = await plain.list.execute({});
    expect(list.isOk()).toBe(true);

    const create = await plain.create.execute({
      name: "Nope",
      isGeneric: true,
      layoutType: "arena",
      state: sampleState,
    });
    expect(create.isFailure()).toBe(true);
    expect(create.errorOrThrow().code).toBe("FORBIDDEN");

    const [row] = await sql<{ id: number }[]>`
      SELECT id FROM collection_stage_plans WHERE archived = false LIMIT 1
    `;
    const update = await plain.update.execute({ id: row.id, expectedVersion: 1 });
    expect(update.errorOrThrow().code).toBe("FORBIDDEN");
    const del = await plain.delete.execute({ id: row.id });
    expect(del.errorOrThrow().code).toBe("FORBIDDEN");
  });

  it("a play owner can duplicate a library plan into their play (copy-on-use, rescaled)", async () => {
    const maint = makeUseCases(maintainerId, "collection-maintainer");
    const created = await maint.create.execute({
      name: "Blackbox 10x10",
      isGeneric: true,
      layoutType: "blackbox",
      state: sampleState, // 12000x8000
    });
    const templateId = created.dataOrThrow().id;

    const owner = makeUseCases(plainUserId); // play owner, no global role
    const res = await owner.duplicate.execute({
      uri: playUri,
      fromCollectionPlanId: templateId,
      newName: "my-blackbox",
      newDimensionsMm: { width: 10000, height: 10000 }, // rescale 12000x8000 -> 10000x10000
    });
    expect(res.isOk()).toBe(true);
    const { plan, copiedCues } = res.dataOrThrow();
    expect(plan.name).toBe("my-blackbox");
    expect(plan.version).toBe(1);
    expect(plan.stageLabel).toBe("Blackbox 10x10");
    expect(copiedCues).toBe(0);

    const stagePlanRepo = new StagePlanRepository(sql, ctxFor(plainUserId));
    const playId = await stagePlanRepo.getPlayIdByUri(playUri);
    const got = await stagePlanRepo.getStagePlan(playId.dataOrThrow(), "my-blackbox");
    const state = got.dataOrThrow().state;
    expect(state.plan.dimensionsMm).toEqual({ width: 10000, height: 10000 });
    expect(state.plan.collectionStagePlanId).toBe(templateId);
    // element c1 (6000,4000) -> fx=10000/12000, fy=10000/8000 -> (5000, 5000)
    expect(state.elements[0]).toMatchObject({ xMm: 5000, yMm: 5000 });
  });
});
