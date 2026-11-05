/// <reference types="@clerk/express/env" />
// to make the file a module and avoid the TypeScript error
export {};

declare global {
  interface CustomJwtSessionClaims {
    userDbId?: number;
    /** Clerk session-token claim mapping `{{user.public_metadata}}`; `role` is validated at runtime with `parseRole`. */
    metadata?: { role?: unknown };
  }
}
