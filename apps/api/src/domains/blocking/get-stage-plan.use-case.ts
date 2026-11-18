import z from "zod";
import { Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import type { UserPlaysRepository } from "../plays/user-plays.repository.ts";
import { PlayAccessForbidden, PlayNotFound } from "../plays/user-plays.repository.ts";
import { StagePlanStateSchema } from "./blocking.models.ts";
import { StagePlanNotFound, StagePlanRepository } from "./stage-plan.repository.ts";

export const GetStagePlanUseCaseInputSchema = z.object({
  uri: z.string().max(36),
  /** plan name; omit to get the most recently modified plan */
  name: z.string().max(100).optional(),
});

export const GetStagePlanUseCaseOutputSchema = z.object({
  plan: z.object({
    id: z.number(),
    name: z.string(),
    state: StagePlanStateSchema,
    version: z.number().int().positive(),
    lastModifiedDate: z.date(),
    createdDate: z.date(),
  }),
});

type Input = z.infer<typeof GetStagePlanUseCaseInputSchema>;
type Output = z.infer<typeof GetStagePlanUseCaseOutputSchema>;

/**
 * Reads a play's stage plan. Requires `blockingRead` — enforced both by the
 * requirePlayPermission middleware on the route and here (defense in depth
 * for non-HTTP callers).
 */
export class GetStagePlanUseCase extends AuthenticatedUseCase<{
  params: Input;
  success: Output;
  failure: PlayNotFound | PlayAccessForbidden | StagePlanNotFound;
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
      permission: "blockingRead",
    });
    if (permission.isFailure()) {
      return Result.failure(permission.errorOrThrow());
    }
    const playId = await this.stagePlanRepository.getPlayIdByUri(input.uri);
    if (playId.isFailure()) {
      return Result.failure(playId.errorOrThrow());
    }
    const plan = await this.stagePlanRepository.getStagePlan(playId.dataOrThrow(), input.name);
    if (plan.isFailure()) {
      return Result.failure(plan.errorOrThrow());
    }
    const p = plan.dataOrThrow();
    return Result.ok({
      plan: {
        id: p.id,
        name: p.name,
        state: p.state,
        version: p.version,
        lastModifiedDate: p.lastModifiedDate,
        createdDate: p.createdDate,
      },
    });
  }

  private stagePlanRepository: StagePlanRepository;
  private userPlaysRepository: UserPlaysRepository;
}
