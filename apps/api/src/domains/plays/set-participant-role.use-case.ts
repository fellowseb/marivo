import z from "zod";
import { ASSIGNABLE_PLAY_ROLES, Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import {
  ParticipantNotFound,
  PlayAccessForbidden,
  PlayNotFound,
  RoleNotFound,
  UserPlaysRepository,
} from "./user-plays.repository.ts";

export const SetParticipantRoleUseCaseInputSchema = z.object({
  uri: z.string().max(36),
  username: z.string().max(80),
  role: z.enum(ASSIGNABLE_PLAY_ROLES),
});

export const SetParticipantRoleUseCaseOutputSchema = z.object({
  uri: z.string().length(36),
  username: z.string().max(80),
  role: z.string(),
});

type SetParticipantRoleUseCaseInput = z.infer<typeof SetParticipantRoleUseCaseInputSchema>;
type SetParticipantRoleUseCaseOutput = z.infer<typeof SetParticipantRoleUseCaseOutputSchema>;

/**
 * Assign a standard role to a play participant. Only the play owner or a
 * user with the settingsWrite permission may do it. The owner's own role
 * is implicit and cannot be changed.
 */
export class SetParticipantRoleUseCase extends AuthenticatedUseCase<{
  params: SetParticipantRoleUseCaseInput;
  success: SetParticipantRoleUseCaseOutput;
  failure: PlayNotFound | PlayAccessForbidden | ParticipantNotFound | RoleNotFound;
}> {
  constructor(playsRepository: UserPlaysRepository, userContextService: UserContextService) {
    super(userContextService);
    this.playsRepository = playsRepository;
  }

  async execute(input: SetParticipantRoleUseCaseInput) {
    const permission = await this.playsRepository.checkPlayPermission({
      uri: input.uri,
      permission: "settingsWrite",
    });
    if (permission.isFailure()) {
      return Result.failure(permission.errorOrThrow());
    }
    const result = await this.playsRepository.setParticipantRole({
      playUri: input.uri,
      username: input.username,
      role: input.role,
    });
    if (result.isFailure()) {
      return Result.failure(result.errorOrThrow());
    }
    return Result.ok({ uri: input.uri, username: input.username, role: input.role });
  }

  private playsRepository: UserPlaysRepository;
}
