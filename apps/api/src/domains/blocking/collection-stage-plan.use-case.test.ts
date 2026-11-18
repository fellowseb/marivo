import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@marivo/utils";
import type { UserContextService } from "../../shared/use-case.ts";
import type {
  CollectionStagePlan,
  CollectionStagePlanSummary,
  StagePlanState,
} from "./blocking.models.ts";
import {
  CollectionStagePlanConflict,
  CollectionStagePlanNotFound,
  type CollectionStagePlanRepository,
} from "./collection-stage-plan.repository.ts";
import {
  CreateStageLibraryPlanUseCase,
  DeleteStageLibraryPlanUseCase,
  GetStageLibraryPlanUseCase,
  ListStageLibraryPlansUseCase,
  UpdateStageLibraryPlanUseCase,
} from "./collection-stage-plan.use-cases.ts";

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
  elements: [],
};

const samplePlan: CollectionStagePlan = {
  id: 1,
  name: "Proscenium 12x8 m",
  state: sampleState,
  version: 2,
  isGeneric: true,
  layoutType: "proscenium",
  theatreName: null,
  city: null,
  country: null,
  archived: false,
  createdBy: 1,
  lastModifiedDate: new Date(0),
  createdDate: new Date(0),
};

const sampleSummary: CollectionStagePlanSummary = {
  id: 1,
  name: "Proscenium 12x8 m",
  version: 2,
  isGeneric: true,
  layoutType: "proscenium",
  theatreName: null,
  city: null,
  country: null,
  archived: false,
  createdBy: 1,
  lastModifiedDate: new Date(0),
  createdDate: new Date(0),
};

function ctxWithRole(role?: string): UserContextService {
  return { get: () => ({ userId: 1, role: role as never }) } as unknown as UserContextService;
}

describe("collection stage library use cases (unit, mocked repository)", () => {
  let repository: vi.Mocked<CollectionStagePlanRepository>;

  beforeEach(() => {
    repository = {
      list: vi.fn().mockResolvedValue([sampleSummary]),
      getById: vi.fn().mockResolvedValue(Result.ok(samplePlan)),
      create: vi.fn().mockResolvedValue({ ...samplePlan, version: 1 }),
      update: vi.fn().mockResolvedValue(Result.ok(samplePlan)),
      archive: vi.fn().mockResolvedValue(Result.ok(undefined)),
    } as unknown as vi.Mocked<CollectionStagePlanRepository>;
  });

  describe("reads (any authenticated user)", () => {
    it("lists plans without requiring a capability", async () => {
      const uc = new ListStageLibraryPlansUseCase(repository, ctxWithRole(undefined));
      const res = await uc.execute({ query: "prosc" });
      expect(res.isOk()).toBe(true);
      expect(res.dataOrThrow().plans).toHaveLength(1);
      expect(repository.list).toHaveBeenCalledWith({
        query: "prosc",
        genericOnly: undefined,
        includeArchived: undefined,
      });
    });

    it("gets a plan by id without requiring a capability", async () => {
      const uc = new GetStageLibraryPlanUseCase(repository, ctxWithRole(undefined));
      const res = await uc.execute({ id: 1 });
      expect(res.isOk()).toBe(true);
      expect(res.dataOrThrow().state.plan.dimensionsMm).toEqual({ width: 12000, height: 8000 });
    });
  });

  describe("mutations (capability-gated)", () => {
    it("create: maintainer succeeds", async () => {
      const uc = new CreateStageLibraryPlanUseCase(
        repository,
        ctxWithRole("collection-maintainer"),
      );
      const res = await uc.execute({
        name: "Arena",
        isGeneric: true,
        layoutType: "arena",
        state: sampleState,
      });
      expect(res.isOk()).toBe(true);
    });

    it("create: plain user gets FORBIDDEN", async () => {
      const uc = new CreateStageLibraryPlanUseCase(repository, ctxWithRole(undefined));
      const res = await uc.execute({
        name: "Arena",
        isGeneric: true,
        layoutType: "arena",
        state: sampleState,
      });
      expect(res.isFailure()).toBe(true);
      expect(res.errorOrThrow().code).toBe("FORBIDDEN");
      expect(repository.create).not.toHaveBeenCalled();
    });

    it("update: admin bypasses, LWW version forwarded", async () => {
      const uc = new UpdateStageLibraryPlanUseCase(repository, ctxWithRole("admin"));
      const res = await uc.execute({ id: 1, expectedVersion: 2, meta: { name: "Renamed" } });
      expect(res.isOk()).toBe(true);
      expect(repository.update).toHaveBeenCalledWith({
        id: 1,
        expectedVersion: 2,
        meta: { name: "Renamed" },
        state: undefined,
      });
    });

    it("update: conflict propagates", async () => {
      repository.update.mockResolvedValueOnce(Result.failure(new CollectionStagePlanConflict(1)));
      const uc = new UpdateStageLibraryPlanUseCase(repository, ctxWithRole("admin"));
      const res = await uc.execute({ id: 1, expectedVersion: 1 });
      expect(res.isFailure()).toBe(true);
      expect(res.errorOrThrow()).toBeInstanceOf(CollectionStagePlanConflict);
    });

    it("delete: maintainer archives; plain user gets FORBIDDEN", async () => {
      const uc = new DeleteStageLibraryPlanUseCase(
        repository,
        ctxWithRole("collection-maintainer"),
      );
      const res = await uc.execute({ id: 1 });
      expect(res.isOk()).toBe(true);

      const denied = new DeleteStageLibraryPlanUseCase(repository, ctxWithRole(undefined));
      const res2 = await denied.execute({ id: 1 });
      expect(res2.isFailure()).toBe(true);
      expect(res2.errorOrThrow().code).toBe("FORBIDDEN");
    });

    it("delete: not found propagates", async () => {
      repository.archive.mockResolvedValueOnce(Result.failure(new CollectionStagePlanNotFound(9)));
      const uc = new DeleteStageLibraryPlanUseCase(repository, ctxWithRole("admin"));
      const res = await uc.execute({ id: 9 });
      expect(res.isFailure()).toBe(true);
      expect(res.errorOrThrow().code).toBe("NOT_FOUND");
    });
  });
});
