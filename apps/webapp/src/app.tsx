import { Navigate, Route, Routes } from 'react-router';
import PageNotFound from './components/page-not-found.component';
import AuthLayout from './layouts/auth-layout';
import MainLayout from './layouts/main-layout';
import PlaysPage, {
  PlaysPageTitle,
} from './features/play-admin/plays-page.component';
import PlayPage, { PlayTitle } from './features/play-admin/play-page.component';
import PlayMenu from './features/play-admin/play-menu.component';
import ScriptTabMenu from './features/script-edition/script-tab-menu.component';
import Signin from './features/auth/signin.component';
import Signup from './features/auth/signup.component';
import './app.css';
import MemorizeTabMenu from './features/lines-memorization/memorize-tab-menu.component';
import BlockingTabMenu from './features/blocking/blocking-tab-menu.component';
import { SignedIn, SignedOut } from '@clerk/clerk-react';

function App() {
  return (
    <>
      <SignedIn>
        <Routes>
          <Route
            element={
              <MainLayout
                title={
                  <Routes>
                    <Route path="/plays" element={<PlaysPageTitle />} />
                    <Route path="/play/:id/*" element={<PlayTitle />} />
                  </Routes>
                }
                Menu={
                  <Routes>
                    <Route path="/play/:id/*" element={<PlayMenu />} />
                  </Routes>
                }
                PageMenu={
                  <Routes>
                    <Route
                      path="/play/:id/script"
                      element={<ScriptTabMenu />}
                    />
                    <Route
                      path="/play/:id/blocking"
                      element={<BlockingTabMenu />}
                    />
                    <Route
                      path="/play/:id/memorize"
                      element={<MemorizeTabMenu />}
                    />
                  </Routes>
                }
              />
            }
          >
            <Route path="/plays" element={<PlaysPage />} />
            <Route path="/play/:id/*" element={<PlayPage />} />
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

export default App;
