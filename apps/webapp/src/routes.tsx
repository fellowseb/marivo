import { Navigate, Route, Routes } from 'react-router';
import PageNotFound from './components/page-not-found.component';
import AuthLayout from './layouts/auth-layout';
import MainLayout from './layouts/main-layout';
import PlaysPage, {
  PlaysPageBreadcrumbs,
} from './features/play-admin/plays-page.component';
import PlayPage, {
  PLAY_ROUTE_BASE,
} from './features/play-admin/play-page.component';
import Signin from './features/auth/signin.component';
import Signup from './features/auth/signup.component';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import UserAccountPage, {
  UserAccountPageBreadcrumbs,
} from './features/user-account/user-account-page.component';
import NewPlayPage, {
  NewPlayPageBreadcrumbs,
} from './features/play-admin/new-play-page.component';

function AppRoutes() {
  const breadcrumbs = (
    <Routes>
      <Route path="/plays" element={<PlaysPageBreadcrumbs />} />
      <Route path="/plays/new" element={<NewPlayPageBreadcrumbs />} />
      <Route path="/my-account" element={<UserAccountPageBreadcrumbs />} />
    </Routes>
  );
  return (
    <>
      <SignedIn>
        <Routes>
          <Route path="*" element={<MainLayout breadcrumbs={breadcrumbs} />}>
            <Route path="plays" element={<PlaysPage />} />
            <Route path="plays/new" element={<NewPlayPage />} />
            <Route path="my-account/security?" element={<UserAccountPage />} />
            <Route path="signin" element={<Navigate to="/plays" replace />} />
            <Route path="signup" element={<Navigate to="/plays" replace />} />
            <Route index element={<Navigate to="plays" replace />}></Route>
            <Route path="*" element={<PageNotFound />} />
          </Route>
          <Route element={<PlayPage />} path={`${PLAY_ROUTE_BASE}/*`} />
        </Routes>
      </SignedIn>

      <SignedOut>
        <Routes>
          <Route path="*" element={<AuthLayout />}>
            <Route path="signin/*" element={<Signin />} />
            <Route path="signup/*" element={<Signup />} />
            <Route path="*" element={<Navigate to="/signin" replace />}></Route>
          </Route>
        </Routes>
      </SignedOut>
    </>
  );
}

export default AppRoutes;
