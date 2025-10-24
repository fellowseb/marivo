import { Navigate, NavLink, Route, Routes, useParams } from 'react-router';
import PageNotFound from '../../components/page-not-found.component';
import ScriptTab from '../script-edition/script-tab.component';
import MemorizeTab from '../lines-memorization/memorize-tab.component';
import PlaySettingsTab from '../play-settings/play-settings-tab.component';
import PlanningTab from '../planning/planning-tab.component';
import BlockingTab from '../blocking/blocking-tab.component';
import StagingDirectionsTab from '../staging-directions/staging-directions-tab.component';
import { HeaderBreadcrumbs } from '../../layouts/header.component';
import styles from './play-page.module.css';
import { PlayContextProvider, usePlayContext } from './play.context';

function PlayPageTitle() {
  const play = usePlayContext();
  if (!play) {
    return null;
  }
  return (
    <div className={styles.playTitle}>
      <div className={styles.playIcon}></div>
      {play.title}
    </div>
  );
}

export function PlayPageBreadcrumbs() {
  const params = useParams();
  const uri = params[PLAY_URI_PARAM];
  if (!uri) {
    return null;
  }
  return (
    <PlayContextProvider uri={uri}>
      <HeaderBreadcrumbs
        key="plays"
        crumbs={[
          <NavLink
            to={{
              pathname: '/plays',
            }}
          >
            My plays
          </NavLink>,
          <PlayPageTitle />,
        ]}
      />
    </PlayContextProvider>
  );
}

export const PLAY_URI_PARAM = 'uri';
export const PLAY_ROUTE_BASE = `/plays/edit/:${PLAY_URI_PARAM}`;

function PlayPage() {
  const params = useParams();
  const uri = params[PLAY_URI_PARAM];
  if (!uri) {
    return null;
  }
  return (
    <PlayContextProvider uri={uri}>
      <Routes>
        <Route path="script" element={<ScriptTab />} />
        <Route path="staging-directions" element={<StagingDirectionsTab />} />
        <Route path="blocking" element={<BlockingTab />} />
        <Route path="memorize" element={<MemorizeTab />} />
        <Route path="planning" element={<PlanningTab />} />
        <Route path="settings" element={<PlaySettingsTab />} />
        <Route index path="/" element={<Navigate to="script" />} />
        <Route index path="*" element={<PageNotFound />} />
      </Routes>
    </PlayContextProvider>
  );
}

export default PlayPage;
