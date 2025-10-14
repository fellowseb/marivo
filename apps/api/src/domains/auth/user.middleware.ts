import { getAuth } from '@clerk/express';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

interface Session {
  userDbId: number;
}

function parseJwtPayload(payload: CustomJwtSessionClaims): Session {
  if ('userDbId' in payload === false) {
    throw new Error('Invalid session token: no userDbId');
  }
  if (typeof payload['userDbId'] !== 'number') {
    throw new Error('Invalid session token: no userDbId');
  }
  return {
    userDbId: payload.userDbId,
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
      throw new Error('Authentication error');
    }
    const { sessionClaims } = auth;
    if (!sessionClaims) {
      throw new Error('No session claims in inbound request');
    }
    const { userDbId } = parseJwtPayload(sessionClaims);
    const context = req.context ?? {};
    context.userId = userDbId;
    req.context = context;
    next();
  };
}
