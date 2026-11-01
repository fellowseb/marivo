import { useAuth } from "@clerk/react";
import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router";
import GlobalSpinner from "./global-spinner.component";

interface AuthGuardProps {
  /** Require signed-in user. When false, requires signed-out (for signin/signup pages). */
  requireAuth: boolean;
  /** Where to redirect when the requirement is not met. */
  redirectTo: string;
  /** Only enforce the guard when current path starts with one of these prefixes. */
  onlyOn?: string[];
}

/**
 * Route guard that waits for Clerk auth to load, then checks auth state.
 * Shows a spinner while loading to avoid flashing protected content
 * or redirecting prematurely (race condition).
 */
export default function AuthGuard(props: PropsWithChildren<AuthGuardProps>) {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  if (!isLoaded) {
    return <GlobalSpinner />;
  }

  const ok = props.requireAuth ? isSignedIn : !isSignedIn;
  const applies = !props.onlyOn || props.onlyOn.some((p) => location.pathname.startsWith(p));
  if (!ok && applies && location.pathname !== props.redirectTo) {
    return (
      <Navigate
        to={props.redirectTo}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // If guard does not apply to this path, or requirement not met but already
  // on redirect target, render children (or nothing to avoid loops).
  if (!applies) {
    return <>{props.children}</>;
  }
  if (!ok) {
    return null;
  }

  return <>{props.children}</>;
}
