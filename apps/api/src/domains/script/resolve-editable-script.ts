import { hasCapability, Result } from "@marivo/utils";
import type { AuthenticatedUserContext } from "../../shared/use-case.ts";
import { ForbiddenError } from "../../shared/error.ts";
import type { UserPlaysRepository, PlayNotFound } from "../plays/user-plays.repository.ts";
import { PlayAccessForbidden } from "../plays/user-plays.repository.ts";
import type {
  PlaysCollectionRepository,
  CollectionPlayNotFound,
} from "../plays/plays-collection.repository.ts";

export type EditableScriptSource = "play" | "collection";

/**
 * Resolve the script id targeted by a script mutation, enforcing access:
 * - "play": the uri must be a play on which the current user holds the given
 *   play-scoped permission (owner bypasses).
 * - "collection": the uri must be a public-domain collection play and the
 *   current user must hold the `edit_collection_play_script` capability.
 */
export async function resolveEditableScriptId(
  params: { uri: string; from: EditableScriptSource; permission?: "scriptRead" | "scriptWrite" },
  deps: {
    userPlaysRepository: UserPlaysRepository;
    playsCollectionRepository: PlaysCollectionRepository;
    userContext: AuthenticatedUserContext;
  },
): Promise<Result<number, PlayNotFound | CollectionPlayNotFound | ForbiddenError>> {
  if (params.from === "collection") {
    if (!hasCapability(deps.userContext.role, "edit_collection_play_script")) {
      return Result.failure(
        new ForbiddenError("Capability 'edit_collection_play_script' is required"),
      );
    }
    return deps.playsCollectionRepository.getScriptIdByUri({ uri: params.uri });
  }
  const permission = params.permission ?? "scriptWrite";
  const result = await deps.userPlaysRepository.getScriptIdForPermission({
    uri: params.uri,
    permission,
  });
  if (result.isFailure()) {
    const error = result.errorOrThrow();
    if (error instanceof PlayAccessForbidden) {
      return Result.failure(new ForbiddenError(`Permission '${permission}' is required`));
    }
    return Result.failure(error as PlayNotFound);
  }
  return Result.ok(result.dataOrThrow());
}
