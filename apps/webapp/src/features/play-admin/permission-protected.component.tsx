import { useEffect, type PropsWithChildren } from 'react';
import { useLocation } from 'react-router';
import type { AppRouterOutput } from '@marivo/api';
import { usePlayContext } from './play.context';
import {
  PLAY_ROUTE_BASE,
  isPlaySubpath,
  useNavigateToDefaultPlaySubpath,
  type PlaySubPath,
} from './play-page.component';
import { useNotifications } from '../../components/notifications.context.tsx';

type PlayPermissions = AppRouterOutput['plays']['playDetails']['permissions'];

type PlayPermission =
  keyof AppRouterOutput['plays']['playDetails']['permissions'];

const PATH_TO_PERM: Record<PlaySubPath, PlayPermission> = {
  script: 'scriptRead',
  'staging-notes': 'stagingNotesRead',
  blocking: 'blockingRead',
  memorize: 'memorizeRead',
  planning: 'planningRead',
  settings: 'settingsRead',
};

export function checkPermission(
  permissions: PlayPermissions | undefined,
  subpath: string,
) {
  return (
    isPlaySubpath(subpath) && Boolean(permissions?.[PATH_TO_PERM[subpath]])
  );
}

function PermissionProtected(props: PropsWithChildren) {
  const playContext = usePlayContext();
  const { pathname } = useLocation();
  const relativePath = pathname.substring(
    PLAY_ROUTE_BASE.replace(
      ':uri',
      playContext?.dataOr(undefined)?.details.uri ?? '',
    ).length + 1,
  );
  const hasPermission = checkPermission(
    playContext?.dataOr(undefined)?.permissions,
    relativePath,
  );
  useNavigateToDefaultPlaySubpath(playContext, {
    activate: !hasPermission,
    fromIndex: false,
  });
  const { showNotification } = useNotifications();
  useEffect(() => {
    if (!hasPermission) {
      showNotification({
        id: 'PermissionProtected',
        autoHide: true,
        type: 'error',
        message:
          `Access to this section is restricted.\n ` +
          `Check with the project owner to gain permission.`,
      });
    }
  }, [hasPermission]);
  return hasPermission ? props.children : null;
}

export default PermissionProtected;
