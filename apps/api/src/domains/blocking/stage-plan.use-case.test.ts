import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@marivo/utils";
import type { UserContextService } from "../../shared/use-case.ts";
import {
  PlayAccessForbidden,
  PlayNotFound,
  type UserPlaysRepository,
} from "../plays/user-plays.repository.ts";
import {
  PlayNotFound as RepoPlayNotFound,
  StagePlanConflict,
  StagePlanNotFound,
  type StagePlanRepository,
} from "./stage-plan.repository.ts";
import type { StagePlan, StagePlanState } from "./blocking.models.ts";
import { GetStagePlanUseCase } from "./get-stage-plan.use-case.ts";
import { ListStagePlansUseCase } from "./list-stage-plans.use-case.ts";
import {
  SaveStagePlanUseCase,
  SaveStagePlanUseCaseInputSchema,
} from "./save-stage-plan.use-case.ts";
import { SetActiveStagePlanUseCase } from "./set-active-stage-plan.use-case.ts";
import { DuplicateStagePlanUseCase } from "./duplicate-stage-plan.use-case.ts";
import { StagePlanNameTaken } from "./stage-plan.repository.ts";

const PLAY_URI = "550e8400-e29b-41d4-a716-446655440000";
const PLAY_ID = 42;

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
  groups: [{ id: "g1", elementIds: ["c1", "p3"] }],
};

const samplePlan: StagePlan = {
  id: 7,
  playId: PLAY_ID,
  name: "default",
  state: sampleState,
  version: 3,
  description: null,
  stageLabel: "Salle de répétition",
  isActive: true,
  lastModifiedDate: new Date(0),
  createdDate: new Date(0),
};

describe("blocking stage-plan use cases (unit, mocked repositories)", () => {
  let stagePlanRepository: vi.Mocked<StagePlanRepository>;
  let userPlaysRepository: vi.Mocked<UserPlaysRepository>;
  let userContext: UserContextService;

  beforeEach(() => {
    stagePlanRepository = {
      getPlayIdByUri: vi.fn().mockResolvedValue(Result.ok(PLAY_ID)),
      getStagePlan: vi.fn().mockResolvedValue(Result.ok(samplePlan)),
      listStagePlans: vi.fn().mockResolvedValue([
        {
          id: 7,
          name: "default",
          version: 3,
          lastModifiedDate: new Date(0),
          createdDate: new Date(0),
        },
      ]),
      saveStagePlan: vi.fn().mockResolvedValue(Result.ok(4)),
      setActiveStagePlan: vi.fn().mockResolvedValue(Result.ok(undefined)),
      duplicateStagePlan: vi
        .fn()
        .mockResolvedValue(
          Result.ok({
            plan: { ...samplePlan, id: 8, name: "show", version: 1, isActive: false },
            copiedCues: 2,
            outOfBoundsElementIds: [],
          }),
        ),
    } as unknown as vi.Mocked<StagePlanRepository>;
    userPlaysRepository = {
      checkPlayPermission: vi.fn().mockResolvedValue(Result.ok(undefined)),
    } as unknown as vi.Mocked<UserPlaysRepository>;
    userContext = { get: () => ({ userId: 1 }) } as unknown as UserContextService;
  });

  describe("GetStagePlanUseCase", () => {
    it("returns the plan for a user with blockingRead", async () => {
      const uc = new GetStagePlanUseCase(stagePlanRepository, userPlaysRepository, userContext);
      const res = await uc.execute({ uri: PLAY_URI, name: "default" });
      expect(res.isOk()).toBe(true);
      expect(res.dataOrThrow().plan.version).toBe(3);
      expect(userPlaysRepository.checkPlayPermission).toHaveBeenCalledWith({
        uri: PLAY_URI,
        permission: "blockingRead",
      });
    });

    it("fails with FORBIDDEN when blockingRead is missing", async () => {
      userPlaysRepository.checkPlayPermission.mockResolvedValueOnce(
        Result.failure(new PlayAccessForbidden()),
      );
      const uc = new GetStagePlanUseCase(stagePlanRepository, userPlaysRepository, userContext);
      const res = await uc.execute({ uri: PLAY_URI });
      expect(res.isFailure()).toBe(true);
      expect(res.errorOrThrow().code).toBe("FORBIDDEN");
    });

    it("fails with NOT_FOUND when the plan does not exist", async () => {
      stagePlanRepository.getStagePlan.mockResolvedValueOnce(
        Result.failure(new StagePlanNotFound("nope")),
      );
      const uc = new GetStagePlanUseCase(stagePlanRepository, userPlaysRepository, userContext);
      const res = await uc.execute({ uri: PLAY_URI, name: "nope" });
      expect(res.isFailure()).toBe(true);
      expect(res.errorOrThrow().code).toBe("NOT_FOUND");
    });
  });

  describe("ListStagePlansUseCase", () => {
    it("lists plan summaries for a user with blockingRead", async () => {
      const uc = new ListStagePlansUseCase(stagePlanRepository, userPlaysRepository, userContext);
      const res = await uc.execute({ uri: PLAY_URI });
      expect(res.isOk()).toBe(true);
      expect(res.dataOrThrow().plans).toHaveLength(1);
      expect(res.dataOrThrow().plans[0].name).toBe("default");
    });

    it("fails with NOT_FOUND for an unknown play uri", async () => {
      stagePlanRepository.getPlayIdByUri.mockResolvedValueOnce(
        Result.failure(new RepoPlayNotFound(PLAY_URI)),
      );
      const uc = new ListStagePlansUseCase(stagePlanRepository, userPlaysRepository, userContext);
      const res = await uc.execute({ uri: PLAY_URI });
      expect(res.isFailure()).toBe(true);
      expect(res.errorOrThrow().code).toBe("NOT_FOUND");
    });
  });

  describe("SaveStagePlanUseCase", () => {
    it("saves with the expected version and returns the new version (blockingWrite)", async () => {
      const uc = new SaveStagePlanUseCase(stagePlanRepository, userPlaysRepository, userContext);
      const res = await uc.execute({
        uri: PLAY_URI,
        name: "default",
        state: sampleState,
        version: 3,
      });
      expect(res.isOk()).toBe(true);
      expect(res.dataOrThrow().version).toBe(4);
      expect(userPlaysRepository.checkPlayPermission).toHaveBeenCalledWith({
        uri: PLAY_URI,
        permission: "blockingWrite",
      });
      expect(stagePlanRepository.saveStagePlan).toHaveBeenCalledWith({
        playId: PLAY_ID,
        name: "default",
        state: sampleState,
        expectedVersion: 3,
      });
    });

    it("fails with FORBIDDEN when blockingWrite is missing (viewer)", async () => {
      userPlaysRepository.checkPlayPermission.mockResolvedValueOnce(
        Result.failure(new PlayAccessForbidden()),
      );
      const uc = new SaveStagePlanUseCase(stagePlanRepository, userPlaysRepository, userContext);
      const res = await uc.execute({
        uri: PLAY_URI,
        name: "default",
        state: sampleState,
        version: 3,
      });
      expect(res.isFailure()).toBe(true);
      expect(res.errorOrThrow().code).toBe("FORBIDDEN");
      expect(stagePlanRepository.saveStagePlan).not.toHaveBeenCalled();
    });

    it("fails with conflict when the stored version moved on (LWW)", async () => {
      stagePlanRepository.saveStagePlan.mockResolvedValueOnce(
        Result.failure(new StagePlanConflict("default")),
      );
      const uc = new SaveStagePlanUseCase(stagePlanRepository, userPlaysRepository, userContext);
      const res = await uc.execute({
        uri: PLAY_URI,
        name: "default",
        state: sampleState,
        version: 3,
      });
      expect(res.isFailure()).toBe(true);
      expect(res.errorOrThrow()).toBeInstanceOf(StagePlanConflict);
    });

    it("fails with NOT_FOUND for an unknown play uri", async () => {
      userPlaysRepository.checkPlayPermission.mockResolvedValueOnce(
        Result.failure(new PlayNotFound(PLAY_URI)),
      );
      const uc = new SaveStagePlanUseCase(stagePlanRepository, userPlaysRepository, userContext);
      const res = await uc.execute({
        uri: PLAY_URI,
        name: "default",
        state: sampleState,
        version: 1,
      });
      expect(res.isFailure()).toBe(true);
      expect(res.errorOrThrow().code).toBe("NOT_FOUND");
    });
  });

  describe("SaveStagePlanUseCaseInputSchema (route input validation)", () => {
    it("accepts a valid floor plan state (integer mm)", () => {
      const parsed = SaveStagePlanUseCaseInputSchema.safeParse({
        uri: PLAY_URI,
        name: "default",
        state: sampleState,
        version: 1,
      });
      expect(parsed.success).toBe(true);
    });

    it("rejects float or negative millimeter values", () => {
      const bad = structuredClone(sampleState);
      bad.elements[0].xMm = 4200.5;
      const parsed = SaveStagePlanUseCaseInputSchema.safeParse({
        uri: PLAY_URI,
        name: "default",
        state: bad,
        version: 1,
      });
      expect(parsed.success).toBe(false);
    });

    it("rejects an unknown schemaVersion", () => {
      const bad = structuredClone(sampleState);
      (bad as { schemaVersion: number }).schemaVersion = 99;
      const parsed = SaveStagePlanUseCaseInputSchema.safeParse({
        uri: PLAY_URI,
        name: "default",
        state: bad,
        version: 1,
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe("SetActiveStagePlanUseCase", () => {
    it("activates the named plan (blockingWrite)", async () => {
      const uc = new SetActiveStagePlanUseCase(
        stagePlanRepository,
        userPlaysRepository,
        userContext,
      );
      const res = await uc.execute({ uri: PLAY_URI, name: "default" });
      expect(res.isOk()).toBe(true);
      expect(res.dataOrThrow()).toEqual({ name: "default", isActive: true });
      expect(userPlaysRepository.checkPlayPermission).toHaveBeenCalledWith({
        uri: PLAY_URI,
        permission: "blockingWrite",
      });
    });

    it("fails with FORBIDDEN when blockingWrite is missing", async () => {
      userPlaysRepository.checkPlayPermission.mockResolvedValueOnce(
        Result.failure(new PlayAccessForbidden()),
      );
      const uc = new SetActiveStagePlanUseCase(
        stagePlanRepository,
        userPlaysRepository,
        userContext,
      );
      const res = await uc.execute({ uri: PLAY_URI, name: "default" });
      expect(res.isFailure()).toBe(true);
      expect(res.errorOrThrow().code).toBe("FORBIDDEN");
    });
  });

  describe("DuplicateStagePlanUseCase", () => {
    it("duplicates a project with optional new stage dimensions (blockingWrite)", async () => {
      const uc = new DuplicateStagePlanUseCase(
        stagePlanRepository,
        userPlaysRepository,
        userContext,
      );
      const res = await uc.execute({
        uri: PLAY_URI,
        name: "default",
        newName: "show",
        stageLabel: "Théâtre du Soleil",
        newLibraryPlanId: "real:soleil",
        newDimensionsMm: { width: 6000, height: 4000 },
      });
      expect(res.isOk()).toBe(true);
      expect(res.dataOrThrow().plan.name).toBe("show");
      expect(res.dataOrThrow().plan.version).toBe(1);
      expect(res.dataOrThrow().copiedCues).toBe(2);
      expect(stagePlanRepository.duplicateStagePlan).toHaveBeenCalledWith(
        expect.objectContaining({
          playId: PLAY_ID,
          name: "default",
          newName: "show",
          newDimensionsMm: { width: 6000, height: 4000 },
        }),
      );
    });

    it("fails with BAD_REQUEST when the new name is taken", async () => {
      stagePlanRepository.duplicateStagePlan.mockResolvedValueOnce(
        Result.failure(new StagePlanNameTaken("show")),
      );
      const uc = new DuplicateStagePlanUseCase(
        stagePlanRepository,
        userPlaysRepository,
        userContext,
      );
      const res = await uc.execute({ uri: PLAY_URI, name: "default", newName: "show" });
      expect(res.isFailure()).toBe(true);
      expect(res.errorOrThrow()).toBeInstanceOf(StagePlanNameTaken);
    });

    it("fails with FORBIDDEN for a viewer", async () => {
      userPlaysRepository.checkPlayPermission.mockResolvedValueOnce(
        Result.failure(new PlayAccessForbidden()),
      );
      const uc = new DuplicateStagePlanUseCase(
        stagePlanRepository,
        userPlaysRepository,
        userContext,
      );
      const res = await uc.execute({ uri: PLAY_URI, name: "default", newName: "show" });
      expect(res.isFailure()).toBe(true);
      expect(res.errorOrThrow().code).toBe("FORBIDDEN");
      expect(stagePlanRepository.duplicateStagePlan).not.toHaveBeenCalled();
    });
  });
});
