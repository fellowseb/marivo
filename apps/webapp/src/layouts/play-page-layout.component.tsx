import { Outlet, Route, Routes } from 'react-router';
import { usePlayContext } from '../features/play-admin/play.context';
import { MainLayoutBase } from './main-layout';
import { PLAY_MENU_DEFINITION } from '../features/play-admin/play-page-menubar';
import { MenuBar } from '../components/menubar.component';
import Toolbar from '../components/toolbar.component';
import { PlayPageBreadcrumbs } from '../features/play-admin/play-page.component';
import { SCRIPT_TOOLBAR } from '../features/script-edition/script-tab-toolbar';
import { BLOCKING_TOOLBAR } from '../features/blocking/blocking-tab-toolbar';
import { MEMORIZE_TOOLBAR } from '../features/lines-memorization/memorize-tab-toolbar';
import DotsLoader from '../components/dots-loader';

function PlayPageLayout() {
  const playContext = usePlayContext();
  return (
    <MainLayoutBase
      breadcrumbs={
        <Routes>
          <Route path={`*`} element={<PlayPageBreadcrumbs />} />
        </Routes>
      }
      Menu={
        playContext ? (
          <Routes>
            <Route
              path={`*`}
              element={<MenuBar definition={PLAY_MENU_DEFINITION} />}
            />
          </Routes>
        ) : null
      }
      Toolbar={
        playContext ? (
          <Routes>
            <Route
              path={`script`}
              element={<Toolbar definition={SCRIPT_TOOLBAR} />}
            />
            <Route
              path={`blocking`}
              element={<Toolbar definition={BLOCKING_TOOLBAR} />}
            />
            <Route
              path={`memorize`}
              element={<Toolbar definition={MEMORIZE_TOOLBAR} />}
            />
          </Routes>
        ) : null
      }
    >
      {playContext ? <Outlet /> : <DotsLoader />}
    </MainLayoutBase>
  );
}

export default PlayPageLayout;
