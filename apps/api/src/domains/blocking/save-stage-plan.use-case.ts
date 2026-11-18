import z from "zod";
import { Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import type { UserPlaysRepository } from "../plays/user-plays.repository.ts";
import { PlayAccessForbidden, PlayNotFound } from "../plays/user-plays.repository.ts";
import { StagePlanStateSchema } from "./blocking.models.ts";
import {
  PlayNotFound as StagePlanPlayNotFound,
  StagePlanConflict,
  StagePlanRepository,
} from "./stage-plan.repository.ts";

export const SaveStagePlanUseCaseInputSchema = z.object({
  uri: z.string().max(36),
  name: z.string().max(100),
  state: StagePlanStateSchema,
  /** last version the client saw; the save only applies if it still matches (LWW) */
  version: z.number().int().positive(),
  description: z.string().max(2000).nullish(),
  stageLabel: z.string().max(100).nullish(),
});

export const SaveStagePlanUseCaseOutputSchema = z.object({
  version: z.number().int().positive(),
  lastModifiedDate: z.date(),
});

type Input = z.infer<typeof SaveStagePlanUseCaseInputSchema>;
type Output = z.infer<typeof SaveStagePlanUseCaseOutputSchema>;

/**
 * Saves a play's stage plan with optimistic concurrency (last-write-wins on
 * `version`). Requires `blockingWrite` — middleware on the route + here.
 */
export class SaveStagePlanUseCase extends AuthenticatedUseCase<{
  params: Input;
  success: Output;
  failure: PlayNotFound | PlayAccessForbidden | StagePlanPlayNotFound | StagePlanConflict;
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
    const saved = await this.stagePlanRepository.saveStagePlan({
      playId: playId.dataOrThrow(),
      name: input.name,
      state: input.state,
      expectedVersion: input.version,
      description: input.description,
      stageLabel: input.stageLabel,
    });
    if (saved.isFailure()) {
      return Result.failure(saved.errorOrThrow());
    }
    const plan = await this.stagePlanRepository.getStagePlan(playId.dataOrThrow(), input.name);
    const lastModifiedDate = plan.isOk() ? plan.dataOrThrow().lastModifiedDate : new Date();
    return Result.ok({ version: saved.dataOrThrow(), lastModifiedDate });
  }

  private stagePlanRepository: StagePlanRepository;
  private userPlaysRepository: UserPlaysRepository;
}
