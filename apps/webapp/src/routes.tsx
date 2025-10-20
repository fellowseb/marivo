import { Navigate, Route, Routes, useMatch } from 'react-router';
import PageNotFound from './components/page-not-found.component';
import AuthLayout from './layouts/auth-layout';
import MainLayout from './layouts/main-layout';
import PlaysPage, {
  PlaysPageBreadcrumbs,
} from './features/play-admin/plays-page.component';
import PlayPage, {
  PlayPageBreadcrumbs,
} from './features/play-admin/play-page.component';
import Signin from './features/auth/signin.component';
import Signup from './features/auth/signup.component';
import { PLAY_MENU_DEFINITION } from './features/play-admin/play-page-menubar';
import { SCRIPT_TOOLBAR } from './features/script-edition/script-tab-toolbar';
import { MEMORIZE_TOOLBAR } from './features/lines-memorization/memorize-tab-toolbar';
import { BLOCKING_TOOLBAR } from './features/blocking/blocking-tab-toolbar';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import UserAccountPage, {
  UserAccountPageBreadcrumbs,
} from './features/user-account/user-account-page.component';
import NewPlayPage, {
  NewPlayPageBreadcrumbs,
} from './features/play-admin/new-play-page.component';
import { MenuBar } from './components/menubar.component';
import Toolbar from './components/toolbar.component';

function AppRoutes() {
  const playMatches = useMatch('/play/:id/*');
  let Menu = null;
  let Tools = null;
  const breadcrumbs = (
    <Routes>
      <Route path="/plays" element={<PlaysPageBreadcrumbs />} />
      <Route path="/plays/new" element={<NewPlayPageBreadcrumbs />} />
      <Route path="/play/:id/*" element={<PlayPageBreadcrumbs />} />
      <Route path="/my-account" element={<UserAccountPageBreadcrumbs />} />
    </Routes>
  );
  if (playMatches) {
    Menu = (
      <Routes>
        <Route
          path="/play/:id/*"
          element={<MenuBar definition={PLAY_MENU_DEFINITION} />}
        />
      </Routes>
    );
    Tools = (
      <Routes>
        <Route
          path="/play/:id/script"
          element={<Toolbar definition={SCRIPT_TOOLBAR} />}
        />
        <Route
          path="/play/:id/blocking"
          element={<Toolbar definition={BLOCKING_TOOLBAR} />}
        />
        <Route
          path="/play/:id/memorize"
          element={<Toolbar definition={MEMORIZE_TOOLBAR} />}
        />
      </Routes>
    );
  }
  return (
    <>
      <SignedIn>
        <Routes>
          <Route
            element={
              <MainLayout
                breadcrumbs={breadcrumbs}
                Menu={Menu}
                Toolbar={Tools}
              />
            }
          >
            <Route path="/plays" element={<PlaysPage />} />
            <Route path="/plays/new" element={<NewPlayPage />} />
            <Route path="/play/:id/*" element={<PlayPage />} />
            <Route path="/my-account/security?" element={<UserAccountPage />} />
            <Route path="/" element={<Navigate to="/plays" replace />}></Route>
            <Route path="*" element={<PageNotFound />} />
          </Route>
        </Routes>
      </SignedIn>

      <SignedOut>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/signin/*" element={<Signin />} />
            <Route path="/signup/*" element={<Signup />} />
          </Route>
          <Route path="/" element={<Navigate to="/signin" replace />}></Route>
          <Route path="*" element={<Navigate to="/signin" replace />}></Route>
        </Routes>
      </SignedOut>
    </>
  );
}

export default AppRoutes;
