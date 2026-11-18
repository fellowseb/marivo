import z from "zod";
import { Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import type { UserPlaysRepository } from "../plays/user-plays.repository.ts";
import { PlayAccessForbidden, PlayNotFound } from "../plays/user-plays.repository.ts";
import { StagePlanSummarySchema } from "./get-stage-plan.use-case.ts";
import {
  PlayNotFound as StagePlanPlayNotFound,
  StagePlanNameTaken,
  StagePlanNotFound,
  StagePlanRepository,
} from "./stage-plan.repository.ts";
import { CollectionStagePlanNotFound } from "./collection-stage-plan.repository.ts";

export const DuplicateStagePlanUseCaseInputSchema = z
  .object({
    uri: z.string().max(36),
    /** source blocking project (exactly one of name / fromCollectionPlanId) */
    name: z.string().max(100).optional(),
    /** or: seed from a stage-library template (copy-on-use, #230) */
    fromCollectionPlanId: z.number().int().positive().optional(),
    newName: z.string().max(100),
    description: z.string().max(2000).nullish(),
    stageLabel: z.string().max(100).nullish(),
    /** swap the stage library plan when adapting to a new venue */
    newCollectionStagePlanId: z.number().int().positive().nullable().optional(),
    /** adapt all mm coordinates to a new stage size */
    newDimensionsMm: z
      .object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      })
      .optional(),
  })
  .refine((v) => (v.name === undefined) !== (v.fromCollectionPlanId === undefined), {
    message: "exactly one of name / fromCollectionPlanId is required",
  });

export const DuplicateStagePlanUseCaseOutputSchema = z.object({
  plan: StagePlanSummarySchema,
  copiedCues: z.number().int().nonnegative(),
  outOfBoundsElementIds: z.array(z.string()),
});

type Input = z.infer<typeof DuplicateStagePlanUseCaseInputSchema>;

/**
 * Duplicates a blocking project under a new name, optionally adapted to a new
 * stage (library plan + dimensions; mm coordinates are rescaled server-side).
 * Requires `blockingWrite` — middleware on the route + here.
 */
export class DuplicateStagePlanUseCase extends AuthenticatedUseCase<{
  params: Input;
  success: {
    plan: {
      id: number;
      name: string;
      version: number;
      description: string | null;
      stageLabel: string | null;
      isActive: boolean;
      lastModifiedDate: Date;
      createdDate: Date;
    };
    copiedCues: number;
    outOfBoundsElementIds: string[];
  };
  failure:
    | PlayNotFound
    | PlayAccessForbidden
    | StagePlanPlayNotFound
    | StagePlanNotFound
    | StagePlanNameTaken
    | CollectionStagePlanNotFound;
}> {
  constructor(
    stagePlanRepository: StagePlanRepository,
    userPlaysRepository: UserPlaysRepository,
    userContext: UserContextService,
  ) {
    super(userContext);
    this.stagePlanRepository = stagePlanRepository;
    this.userPlaysRepository = userPlaysRepository;
  }

  async execute(input: Input) {
    const permission = await this.userPlaysRepository.checkPlayPermission({
      uri: input.uri,
      permission: "blockingWrite",
    });
    if (permission.isFailure()) {
      return Result.failure(permission.errorOrThrow());
    }
    const playId = await this.stagePlanRepository.getPlayIdByUri(input.uri);
    if (playId.isFailure()) {
      return Result.failure(playId.errorOrThrow());
    }
    const res =
      input.fromCollectionPlanId !== undefined
        ? await this.stagePlanRepository.createFromCollectionPlan({
            playId: playId.dataOrThrow(),
            collectionPlanId: input.fromCollectionPlanId,
            newName: input.newName,
            description: input.description,
            stageLabel: input.stageLabel,
            newDimensionsMm: input.newDimensionsMm,
          })
        : await this.stagePlanRepository.duplicateStagePlan({
            playId: playId.dataOrThrow(),
            name: input.name!,
            newName: input.newName,
            description: input.description,
            stageLabel: input.stageLabel,
            newCollectionStagePlanId: input.newCollectionStagePlanId,
            newDimensionsMm: input.newDimensionsMm,
          });
    if (res.isFailure()) {
      return Result.failure(res.errorOrThrow());
    }
    const { plan, copiedCues, outOfBoundsElementIds } = res.dataOrThrow();
    return Result.ok({
      plan: {
        id: plan.id,
        name: plan.name,
        version: plan.version,
        description: plan.description,
        stageLabel: plan.stageLabel,
        isActive: plan.isActive,
        lastModifiedDate: plan.lastModifiedDate,
        createdDate: plan.createdDate,
      },
      copiedCues,
      outOfBoundsElementIds,
    });
  }

  private stagePlanRepository: StagePlanRepository;
  private userPlaysRepository: UserPlaysRepository;
}
