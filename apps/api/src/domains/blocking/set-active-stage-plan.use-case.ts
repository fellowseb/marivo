import z from "zod";
import { Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import type { UserPlaysRepository } from "../plays/user-plays.repository.ts";
import { PlayAccessForbidden, PlayNotFound } from "../plays/user-plays.repository.ts";
import { StagePlanNotFound, StagePlanRepository } from "./stage-plan.repository.ts";

export const SetActiveStagePlanUseCaseInputSchema = z.object({
  uri: z.string().max(36),
  name: z.string().max(100),
});

export const SetActiveStagePlanUseCaseOutputSchema = z.object({
  name: z.string(),
  isActive: z.literal(true),
});

type Input = z.infer<typeof SetActiveStagePlanUseCaseInputSchema>;
type Output = z.infer<typeof SetActiveStagePlanUseCaseOutputSchema>;

/**
 * Marks one blocking project (stage plan) as the play's active one.
 * Requires `blockingWrite` — middleware on the route + here.
 */
export class SetActiveStagePlanUseCase extends AuthenticatedUseCase<{
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
      permission: "blockingWrite",
    });
    if (permission.isFailure()) {
      return Result.failure(permission.errorOrThrow());
    }
    const playId = await this.stagePlanRepository.getPlayIdByUri(input.uri);
    if (playId.isFailure()) {
      return Result.failure(playId.errorOrThrow());
    }
    const res = await this.stagePlanRepository.setActiveStagePlan({
      playId: playId.dataOrThrow(),
      name: input.name,
    });
    if (res.isFailure()) {
      return Result.failure(res.errorOrThrow());
    }
    return Result.ok({ name: input.name, isActive: true as const });
  }

  private stagePlanRepository: StagePlanRepository;
  private userPlaysRepository: UserPlaysRepository;
}
