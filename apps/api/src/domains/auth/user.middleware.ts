import { getAuth } from "@clerk/express";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { parseRole, type Role } from "@marivo/utils";
import { UnauthorizedError } from "../../shared/error.ts";

interface Session {
  userDbId: number;
  role: Role | undefined;
}

function parseJwtPayload(payload: CustomJwtSessionClaims): Session {
  if ("userDbId" in payload === false) {
    throw new UnauthorizedError("Invalid session token: no userDbId");
  }
  if (typeof payload["userDbId"] !== "number") {
    throw new UnauthorizedError("Invalid session token: no userDbId");
  }
  const metadata = payload.metadata as { role?: unknown } | undefined;
  return {
    userDbId: payload.userDbId,
    role: parseRole(metadata?.role),
  };
}

/**
 * Extract the `userDbId` from the JWT token to inject it
 * in the request object.
 *
 * @return A classic request handler.
 */
export function userMiddleware(): RequestHandler {
  return function (req: Request, _res: Response, next: NextFunction) {
    const auth = getAuth(req);
    if (!auth || !auth.userId) {
      throw new UnauthorizedError("Authentication error");
    }
    const { sessionClaims } = auth;
    if (!sessionClaims) {
      throw new UnauthorizedError("No session claims in inbound request");
    }
    const { userDbId, role } = parseJwtPayload(sessionClaims);
    const context = req.context ?? {};
    context.userId = userDbId;
    if (role !== undefined) {
      context.role = role;
    }
    req.context = context;
    next();
  };
}
