import z from "zod";
import { Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import type { UserPlaysRepository } from "../plays/user-plays.repository.ts";
import { PlayAccessForbidden, PlayNotFound } from "../plays/user-plays.repository.ts";
import { StagePlanRepository } from "./stage-plan.repository.ts";
import { StagePlanSummarySchema } from "./get-stage-plan.use-case.ts";

export const ListStagePlansUseCaseInputSchema = z.object({
  uri: z.string().max(36),
});

export const ListStagePlansUseCaseOutputSchema = z.object({
  plans: z.array(StagePlanSummarySchema),
});

type Input = z.infer<typeof ListStagePlansUseCaseInputSchema>;
type Output = z.infer<typeof ListStagePlansUseCaseOutputSchema>;

/**
 * Lists a play's stage plans (metadata only, no state). Requires
 * `blockingRead` — middleware on the route + here.
 */
export class ListStagePlansUseCase extends AuthenticatedUseCase<{
  params: Input;
  success: Output;
  failure: PlayNotFound | PlayAccessForbidden;
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
    const plans = await this.stagePlanRepository.listStagePlans(playId.dataOrThrow());
    return Result.ok({ plans });
  }

  private stagePlanRepository: StagePlanRepository;
  private userPlaysRepository: UserPlaysRepository;
}
