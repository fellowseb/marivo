import z from "zod";
import { Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import {
  PERMISSIONS_SCHEMA,
  PlayAccessForbidden,
  PlayNotFound,
  RoleAlreadyExists,
  RoleNotFound,
  UserPlaysRepository,
} from "./user-plays.repository.ts";

const UriInput = z.object({ uri: z.string().max(36) });

export const AddPlayRoleUseCaseInputSchema = UriInput.extend({
  name: z.string().min(1).max(32),
});
export const AddPlayRoleUseCaseOutputSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const RemovePlayRoleUseCaseInputSchema = UriInput.extend({
  roleName: z.string().min(1).max(32),
});
export const RemovePlayRoleUseCaseOutputSchema = z.object({
  uri: z.string().length(36),
  roleName: z.string(),
});

export const UpdatePlayRolePermissionsUseCaseInputSchema = UriInput.extend({
  roleName: z.string().min(1).max(32),
  permissions: PERMISSIONS_SCHEMA.strict(),
});
export const UpdatePlayRolePermissionsUseCaseOutputSchema = z.object({
  uri: z.string().length(36),
  roleName: z.string(),
});

/** Base class enforcing the settingsWrite permission (owner bypasses) on role management. */
abstract class PlayRoleManagementUseCase<
  TParams,
  TSuccess,
  TFailure extends PlayNotFound | PlayAccessForbidden | RoleNotFound | RoleAlreadyExists,
> extends AuthenticatedUseCase<{
  params: TParams;
  success: TSuccess;
  failure: TFailure;
}> {
  constructor(playsRepository: UserPlaysRepository, userContextService: UserContextService) {
    super(userContextService);
    this.playsRepository = playsRepository;
  }

  protected async checkCanManage(uri: string): Promise<Result<undefined, TFailure>> {
    const permission = await this.playsRepository.checkPlayPermission({
      uri,
      permission: "settingsWrite",
    });
    if (permission.isFailure()) {
      return Result.failure(permission.errorOrThrow() as TFailure);
    }
    return Result.ok(undefined);
  }

  protected playsRepository: UserPlaysRepository;
}

/** Add a new role to the play (default mostly-denied permissions). */
export class AddPlayRoleUseCase extends PlayRoleManagementUseCase<
  z.infer<typeof AddPlayRoleUseCaseInputSchema>,
  z.infer<typeof AddPlayRoleUseCaseOutputSchema>,
  PlayNotFound | PlayAccessForbidden | RoleAlreadyExists
> {
  async execute(input: z.infer<typeof AddPlayRoleUseCaseInputSchema>) {
    const guard = await this.checkCanManage(input.uri);
    if (guard.isFailure()) {
      return Result.failure(guard.errorOrThrow());
    }
    const result = await this.playsRepository.addRole({ playUri: input.uri, name: input.name });
    if (result.isFailure()) {
      return Result.failure(result.errorOrThrow());
    }
    return Result.ok(result.dataOrThrow());
  }
}

/** Remove a role; participants holding it fall back to default permissions. */
export class RemovePlayRoleUseCase extends PlayRoleManagementUseCase<
  z.infer<typeof RemovePlayRoleUseCaseInputSchema>,
  z.infer<typeof RemovePlayRoleUseCaseOutputSchema>,
  PlayNotFound | PlayAccessForbidden | RoleNotFound
> {
  async execute(input: z.infer<typeof RemovePlayRoleUseCaseInputSchema>) {
    const guard = await this.checkCanManage(input.uri);
    if (guard.isFailure()) {
      return Result.failure(guard.errorOrThrow());
    }
    if (input.roleName === "owner") {
      return Result.failure(new RoleNotFound(input.roleName));
    }
    const result = await this.playsRepository.removeRole({
      playUri: input.uri,
      roleName: input.roleName,
    });
    if (result.isFailure()) {
      return Result.failure(result.errorOrThrow());
    }
    return Result.ok({ uri: input.uri, roleName: input.roleName });
  }
}

/** Overwrite a role's permission set. */
export class UpdatePlayRolePermissionsUseCase extends PlayRoleManagementUseCase<
  z.infer<typeof UpdatePlayRolePermissionsUseCaseInputSchema>,
  z.infer<typeof UpdatePlayRolePermissionsUseCaseOutputSchema>,
  PlayNotFound | PlayAccessForbidden | RoleNotFound
> {
  async execute(input: z.infer<typeof UpdatePlayRolePermissionsUseCaseInputSchema>) {
    const guard = await this.checkCanManage(input.uri);
    if (guard.isFailure()) {
      return Result.failure(guard.errorOrThrow());
    }
    if (input.roleName === "owner") {
      return Result.failure(new RoleNotFound(input.roleName));
    }
    const result = await this.playsRepository.updateRolePermissions({
      playUri: input.uri,
      roleName: input.roleName,
      permissions: input.permissions,
    });
    if (result.isFailure()) {
      return Result.failure(result.errorOrThrow());
    }
    return Result.ok({ uri: input.uri, roleName: input.roleName });
  }
}
