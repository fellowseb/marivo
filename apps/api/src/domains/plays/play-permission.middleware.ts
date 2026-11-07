import type { Request } from "express";
import { getDatabase } from "../../infra/db.ts";
import { appErrorToTrpcError } from "../../shared/trpc-delivery.ts";
import { UserContextService } from "../../shared/use-case.ts";
import type { PlayPermission } from "@marivo/utils";
import { UserPlaysRepository } from "./user-plays.repository.ts";

/**
 * tRPC middleware factory enforcing a play-scoped permission server-side.
 *
 * Apply it when registering routes whose input targets a play script
 * (`{ uri, from }`). The check runs only when `from` is "play" (or absent,
 * since "play" is the default source); "import" and "collection" sources are
 * authorized separately (ownership / global capability).
 *
 * Usage: `script.saveLineContent: publicProcedure.input(...).use(requirePlayPermission("scriptWrite"))...`
 */
export function requirePlayPermission(permission: PlayPermission) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async ({ ctx, input, next }: any) => {
    const from = input?.from ?? "play";
    if (from === "play" && typeof input?.uri === "string") {
      await getDatabase().begin(async (sql) => {
        const userContextService = new UserContextService(ctx.req as Request);
        const repository = new UserPlaysRepository(sql, userContextService);
        const res = await repository.checkPlayPermission({ uri: input.uri, permission });
        if (res.isFailure()) {
          throw appErrorToTrpcError(res.errorOrThrow());
        }
      });
    }
    return next();
  };
}
