import { useAuth } from "@clerk/react";
import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router";
import GlobalSpinner from "./global-spinner.component";

/**
 * Top-level auth guard. Waits for Clerk auth to load (shows spinner),
 * then redirects signed-out users to /signin. Signed-in users see children.
 */
export default function AuthGuard(props: PropsWithChildren) {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  if (!isLoaded) {
    return <GlobalSpinner />;
  }

  if (!isSignedIn && !location.pathname.startsWith("/signin") && !location.pathname.startsWith("/signup")) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  return <>{props.children}</>;
}
