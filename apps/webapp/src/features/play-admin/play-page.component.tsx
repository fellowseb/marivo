import { NavLink, Route, Routes, useNavigate, useParams } from 'react-router';
import ScriptTab from '../script-edition/script-tab.component';
import MemorizeTab from '../lines-memorization/memorize-tab.component';
import PlaySettingsTab from '../play-settings/play-settings-tab.component';
import PlanningTab from '../planning/planning-tab.component';
import BlockingTab from '../blocking/blocking-tab.component';
import StagingDirectionsTab from '../staging-directions/staging-directions-tab.component';
import { HeaderBreadcrumbs } from '../../layouts/header.component';
import styles from './play-page.module.css';
import {
  PlayContextProvider,
  usePlayContext,
  type PlayContextResult,
} from './play.context';
import PlayPageLayout from '../../layouts/play-page-layout.component';
import DotsLoader from '../../components/dots-loader';
import PageNotFound from '../../components/page-not-found.component';
import PermissionProtected, {
  checkPermission,
} from './permission-protected.component';
import { useEffect } from 'react';

function PlayPageTitle() {
  const play = usePlayContext();
  if (play === null) {
    return <DotsLoader />;
  }
  return play.match({
    success({ details }) {
      return (
        <div className={styles.playTitle}>
          <div className={styles.playIcon}></div>
          {details.title}
        </div>
      );
    },
    failure() {
      return <>{'?'}</>;
    },
  });
}

export function PlayPageBreadcrumbs() {
  return (
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
  );
}

export const PLAY_URI_PARAM = 'uri';
export const PLAY_ROUTE_BASE = `/plays/edit/:${PLAY_URI_PARAM}`;
export const PLAY_SUB_ROUTES_PATHS = Object.freeze({
  script: 'script',
  stagingNotes: 'staging-notes',
  blocking: 'blocking',
  memorize: 'memorize',
  planning: 'planning',
  settings: 'settings',
});

type ValuesOf<T> = T extends Record<string | number, infer V> ? V : unknown;

export type PlaySubPath = ValuesOf<typeof PLAY_SUB_ROUTES_PATHS>;

export function isPlaySubpath(subpath: string): subpath is PlaySubPath {
  return Object.values(PLAY_SUB_ROUTES_PATHS).includes(subpath as PlaySubPath);
}

export function useNavigateToDefaultPlaySubpath(
  playContext: PlayContextResult,
  opts: { activate: boolean; fromIndex: boolean },
) {
  let redirection: PlaySubPath | undefined;
  for (const key in PLAY_SUB_ROUTES_PATHS) {
    const subpath =
      PLAY_SUB_ROUTES_PATHS[key as keyof typeof PLAY_SUB_ROUTES_PATHS];
    if (checkPermission(playContext?.dataOr(undefined)?.permissions, subpath)) {
      redirection = subpath;
      break;
    }
  }
  const navigate = useNavigate();
  useEffect(() => {
    if (opts.activate && playContext) {
      if (redirection) {
        navigate(
          {
            pathname: `${opts.fromIndex ? '.' : '..'}/${redirection}`,
          },
          { relative: 'path' },
        );
      } else {
        navigate({
          pathname: '/',
        });
      }
    }
  }, [playContext, redirection, opts.activate]);
}

function NavigateToDefaultSubpath() {
  const playContext = usePlayContext();
  useNavigateToDefaultPlaySubpath(playContext, {
    activate: true,
    fromIndex: true,
  });
  return null;
}

function PlayPage() {
  const params = useParams();
  const uri = params[PLAY_URI_PARAM];
  if (!uri) {
    return null;
  }
  return (
    <PlayContextProvider uri={uri}>
      <Routes>
        <Route element={<PlayPageLayout />}>
          <Route
            path={PLAY_SUB_ROUTES_PATHS.script}
            element={
              <PermissionProtected>
                <ScriptTab />
              </PermissionProtected>
            }
          />
          <Route
            path={PLAY_SUB_ROUTES_PATHS.stagingNotes}
            element={
              <PermissionProtected>
                <StagingDirectionsTab />
              </PermissionProtected>
            }
          />
          <Route
            path={PLAY_SUB_ROUTES_PATHS.blocking}
            element={
              <PermissionProtected>
                <BlockingTab />
              </PermissionProtected>
            }
          />
          <Route
            path={PLAY_SUB_ROUTES_PATHS.memorize}
            element={
              <PermissionProtected>
                <MemorizeTab />
              </PermissionProtected>
            }
          />
          <Route
            path={PLAY_SUB_ROUTES_PATHS.planning}
            element={
              <PermissionProtected>
                <PlanningTab />
              </PermissionProtected>
            }
          />
          <Route
            path={PLAY_SUB_ROUTES_PATHS.settings}
            element={
              <PermissionProtected>
                <PlaySettingsTab />
              </PermissionProtected>
            }
          />
          <Route index path="/" element={<NavigateToDefaultSubpath />} />
          <Route path="*" element={<PageNotFound />} />
        </Route>
      </Routes>
    </PlayContextProvider>
  );
}

export default PlayPage;
