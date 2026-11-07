import z from "zod";
import { Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import { PERMISSIONS_SCHEMA } from "./user-plays.repository.ts";
import {
  ParticipantNotFound,
  PlayAccessForbidden,
  PlayNotFound,
  UserPlaysRepository,
} from "./user-plays.repository.ts";

export const SetParticipantPermissionsUseCaseInputSchema = z.object({
  uri: z.string().max(36),
  username: z.string().max(80),
  permissions: PERMISSIONS_SCHEMA.strict(),
});

export const SetParticipantPermissionsUseCaseOutputSchema = z.object({
  uri: z.string().length(36),
  username: z.string().max(80),
});

type SetParticipantPermissionsUseCaseInput = z.infer<
  typeof SetParticipantPermissionsUseCaseInputSchema
>;
type SetParticipantPermissionsUseCaseOutput = z.infer<
  typeof SetParticipantPermissionsUseCaseOutputSchema
>;

/**
 * Set custom permissions for a play participant (stored as a per-participant
 * custom role). Only the play owner or a user with settingsWrite may do it.
 */
export class SetParticipantPermissionsUseCase extends AuthenticatedUseCase<{
  params: SetParticipantPermissionsUseCaseInput;
  success: SetParticipantPermissionsUseCaseOutput;
  failure: PlayNotFound | PlayAccessForbidden | ParticipantNotFound;
}> {
  constructor(playsRepository: UserPlaysRepository, userContextService: UserContextService) {
    super(userContextService);
    this.playsRepository = playsRepository;
  }

  async execute(input: SetParticipantPermissionsUseCaseInput) {
    const permission = await this.playsRepository.checkPlayPermission({
      uri: input.uri,
      permission: "settingsWrite",
    });
    if (permission.isFailure()) {
      return Result.failure(permission.errorOrThrow());
    }
    const result = await this.playsRepository.setParticipantPermissions({
      playUri: input.uri,
      username: input.username,
      permissions: input.permissions,
    });
    if (result.isFailure()) {
      return Result.failure(result.errorOrThrow());
    }
    return Result.ok({ uri: input.uri, username: input.username });
  }

  private playsRepository: UserPlaysRepository;
}
