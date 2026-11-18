import z from "zod";
import { hasCapability, Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import { AppError, ForbiddenError } from "../../shared/error.ts";
import {
  CollectionStagePlanMetaSchema,
  StagePlanStateSchema,
  type CollectionStagePlan,
  type CollectionStagePlanSummary,
} from "./blocking.models.ts";
import {
  CollectionStagePlanConflict,
  CollectionStagePlanNotFound,
  CollectionStagePlanRepository,
} from "./collection-stage-plan.repository.ts";

const IdInput = z.object({ id: z.number().int().positive() });

export const ListStageLibraryPlansInputSchema = z.object({
  query: z.string().max(200).optional(),
  genericOnly: z.boolean().optional(),
  includeArchived: z.boolean().optional(),
});

const summarySchema = z.object({
  id: z.number(),
  name: z.string(),
  version: z.number().int().positive(),
  isGeneric: z.boolean(),
  layoutType: z.enum(["proscenium", "thrust", "arena", "blackbox", "traverse"]).nullish(),
  theatreName: z.string().nullish(),
  city: z.string().nullish(),
  country: z.string().nullish(),
  archived: z.boolean(),
  createdBy: z.number().nullable(),
  lastModifiedDate: z.date(),
  createdDate: z.date(),
});

export const ListStageLibraryPlansOutputSchema = z.object({
  plans: z.array(summarySchema),
});

export const GetStageLibraryPlanOutputSchema = summarySchema.extend({
  state: StagePlanStateSchema,
});

export const CreateStageLibraryPlanInputSchema = CollectionStagePlanMetaSchema.extend({
  state: StagePlanStateSchema,
});

export const UpdateStageLibraryPlanInputSchema = z.object({
  id: z.number().int().positive(),
  expectedVersion: z.number().int().positive(),
  meta: CollectionStagePlanMetaSchema.partial().optional(),
  state: StagePlanStateSchema.optional(),
});

type ListInput = z.infer<typeof ListStageLibraryPlansInputSchema>;
type ListOutput = { plans: CollectionStagePlanSummary[] };
type GetOutput = CollectionStagePlan;
type CreateInput = z.infer<typeof CreateStageLibraryPlanInputSchema>;
type UpdateInput = z.infer<typeof UpdateStageLibraryPlanInputSchema>;

/** Reads are open to any authenticated user (they pick plans from the library). */
export class ListStageLibraryPlansUseCase extends AuthenticatedUseCase<{
  params: ListInput;
  success: ListOutput;
  failure: AppError;
}> {
  constructor(repository: CollectionStagePlanRepository, userContext: UserContextService) {
    super(userContext);
    this.repository = repository;
  }

  async execute(input: ListInput) {
    const plans = await this.repository.list({
      query: input.query,
      genericOnly: input.genericOnly,
      includeArchived: input.includeArchived,
    });
    return Result.ok({ plans });
  }

  private repository: CollectionStagePlanRepository;
}

export class GetStageLibraryPlanUseCase extends AuthenticatedUseCase<{
  params: z.infer<typeof IdInput>;
  success: GetOutput;
  failure: CollectionStagePlanNotFound;
}> {
  constructor(repository: CollectionStagePlanRepository, userContext: UserContextService) {
    super(userContext);
    this.repository = repository;
  }

  async execute(input: z.infer<typeof IdInput>) {
    const res = await this.repository.getById(input.id, { includeArchived: true });
    if (res.isFailure()) return Result.failure(res.errorOrThrow());
    return Result.ok(res.dataOrThrow());
  }

  private repository: CollectionStagePlanRepository;
}

export class CreateStageLibraryPlanUseCase extends AuthenticatedUseCase<{
  params: CreateInput;
  success: GetOutput;
  failure: ForbiddenError;
}> {
  constructor(repository: CollectionStagePlanRepository, userContext: UserContextService) {
    super(userContext);
    this.repository = repository;
  }

  async execute(input: CreateInput) {
    if (!hasCapability(this.getUserContext().role, "create_stage_plan")) {
      return Result.failure(new ForbiddenError("Capability 'create_stage_plan' is required"));
    }
    const created = await this.repository.create({ meta: input, state: input.state });
    return Result.ok(created);
  }

  private repository: CollectionStagePlanRepository;
}

export class UpdateStageLibraryPlanUseCase extends AuthenticatedUseCase<{
  params: UpdateInput;
  success: GetOutput;
  failure: ForbiddenError | CollectionStagePlanNotFound | CollectionStagePlanConflict;
}> {
  constructor(repository: CollectionStagePlanRepository, userContext: UserContextService) {
    super(userContext);
    this.repository = repository;
  }

  async execute(input: UpdateInput) {
    if (!hasCapability(this.getUserContext().role, "edit_stage_plan")) {
      return Result.failure(new ForbiddenError("Capability 'edit_stage_plan' is required"));
    }
    const res = await this.repository.update({
      id: input.id,
      expectedVersion: input.expectedVersion,
      meta: input.meta,
      state: input.state,
    });
    if (res.isFailure()) return Result.failure(res.errorOrThrow());
    return Result.ok(res.dataOrThrow());
  }

  private repository: CollectionStagePlanRepository;
}

export class DeleteStageLibraryPlanUseCase extends AuthenticatedUseCase<{
  params: z.infer<typeof IdInput>;
  success: undefined;
  failure: ForbiddenError | CollectionStagePlanNotFound;
}> {
  constructor(repository: CollectionStagePlanRepository, userContext: UserContextService) {
    super(userContext);
    this.repository = repository;
  }

  async execute(input: z.infer<typeof IdInput>) {
    if (!hasCapability(this.getUserContext().role, "delete_stage_plan")) {
      return Result.failure(new ForbiddenError("Capability 'delete_stage_plan' is required"));
    }
    const res = await this.repository.archive(input.id);
    if (res.isFailure()) return Result.failure(res.errorOrThrow());
    return Result.ok(undefined);
  }

  private repository: CollectionStagePlanRepository;
}
