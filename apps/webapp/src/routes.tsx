import { type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router";
import PageNotFound from "./components/page-not-found.component";
import ErrorBoundary, { ErrorFallback } from "./components/error-boundary.component";
import AuthLayout from "./layouts/auth-layout";
import MainLayout from "./layouts/main-layout";
import PlaysPage, { PlaysPageBreadcrumbs } from "./features/play-admin/plays-page.component";
import PlayPage, { PLAY_ROUTE_BASE } from "./features/play-admin/play-page.component";
import Signin from "./features/auth/signin.component";
import Signup from "./features/auth/signup.component";
import AuthGuard from "./components/auth-guard.component";
import UserAccountPage, {
  UserAccountPageBreadcrumbs,
} from "./features/user-account/user-account-page.component";
import NewPlayPage, { NewPlayPageBreadcrumbs } from "./features/play-admin/new-play-page.component";
import NewEmptyScript, {
  NewEmptyScriptBreadcrumbs,
} from "./features/play-admin/new-empty-script.component";
import ImportScript, {
  ImportScriptBreadcrumbs,
} from "./features/play-admin/import-script.component";
import FromCollection, {
  FromCollectionBreadcrumbs,
} from "./features/play-admin/from-collection.component";
import ScriptImportsPage, {
  ScriptImportsPageBreadcrumbs,
} from "./features/play-admin/script-imports-page.component";
import CollectionPlayEditPage, {
  CollectionPlayEditBreadcrumbs,
  COLLECTION_EDIT_ROUTE,
} from "./features/play-admin/collection-play-edit-page.component";
import { CollectionMetadataContextProvider } from "./features/play-admin/collection-metadata.context";

/** Contain a page-level crash inside its route, keeping the surrounding layout alive. */
function withErrorBoundary(page: ReactNode) {
  return <ErrorBoundary fallback={<ErrorFallback />}>{page}</ErrorBoundary>;
}

function AppRoutes() {
  const breadcrumbs = (
    <Routes>
      <Route path="/plays" element={<PlaysPageBreadcrumbs />} />
      <Route path="/plays/new" element={<NewPlayPageBreadcrumbs />} />
      <Route path="/plays/new/import" element={<ImportScriptBreadcrumbs />} />
      <Route path="/plays/new/empty" element={<NewEmptyScriptBreadcrumbs />} />
      <Route path="/plays/new/from-collection" element={<FromCollectionBreadcrumbs />} />
      <Route path="/plays/imports" element={<ScriptImportsPageBreadcrumbs />} />
      <Route path="/collection/edit/:uri" element={<CollectionPlayEditBreadcrumbs />} />
      <Route path="/my-account" element={<UserAccountPageBreadcrumbs />} />
    </Routes>
  );
  return (
    <AuthGuard>
      <CollectionMetadataContextProvider>
        <Routes>
          <Route
            path="*"
            element={withErrorBoundary(<MainLayout breadcrumbs={breadcrumbs} />)}
          >
            <Route path="plays" element={withErrorBoundary(<PlaysPage />)} />
            <Route path="plays/new" element={withErrorBoundary(<NewPlayPage />)} />
            <Route path="plays/new/empty" element={withErrorBoundary(<NewEmptyScript />)} />
            <Route path="plays/new/import" element={withErrorBoundary(<ImportScript />)} />
            <Route
              path="plays/new/from-collection"
              element={withErrorBoundary(<FromCollection />)}
            />
            <Route path="plays/imports" element={withErrorBoundary(<ScriptImportsPage />)} />
            <Route
              path={COLLECTION_EDIT_ROUTE.replace(/^\//, "")}
              element={withErrorBoundary(<CollectionPlayEditPage />)}
            />
            <Route
              path="my-account/security?"
              element={withErrorBoundary(<UserAccountPage />)}
            />
            <Route path="signin" element={<Navigate to="/plays" replace />} />
            <Route path="signup" element={<Navigate to="/plays" replace />} />
            <Route index element={<Navigate to="plays" replace />}></Route>
            <Route path="*" element={<PageNotFound />} />
          </Route>
          <Route element={withErrorBoundary(<PlayPage />)} path={`${PLAY_ROUTE_BASE}/*`} />
          <Route path="*" element={withErrorBoundary(<AuthLayout />)}>
            <Route path="signin/*" element={withErrorBoundary(<Signin />)} />
            <Route path="signup/*" element={withErrorBoundary(<Signup />)} />
            <Route path="*" element={<Navigate to="/signin" replace />}></Route>
          </Route>
        </Routes>
      </CollectionMetadataContextProvider>
    </AuthGuard>
  );
}

export default AppRoutes;
