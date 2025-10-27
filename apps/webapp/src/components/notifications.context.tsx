import { v7 as uuidV7 } from 'uuid';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { IconValue } from './icon.component';

export const NotificationsContext = createContext<{
  showNotification: (notif: Notification) => string;
  hideNotification: (id: string) => void;
  notifications: DisplayedNotification[];
} | null>(null);

interface Notification {
  id?: string;
  message: string;
  icon?: IconValue;
  type: 'info' | 'error';
  autoHide?: boolean;
}

interface DisplayedNotification extends Notification {
  showTime?: number;
  id: string;
}

const timeoutIds = new Map<string, number>();

export function NotificationsContextProvider(props: PropsWithChildren) {
  const [notifications, setNotifications] = useState<DisplayedNotification[]>(
    [],
  );
  const hideNotification = useCallback((deletedId: string) => {
    setNotifications((notifs) => {
      const withoutNotif = [...notifs];
      const deletedIdx = withoutNotif.findIndex(({ id }) => id === deletedId);
      if (deletedIdx >= 0) {
        withoutNotif.splice(deletedIdx, 1);
      }
      return withoutNotif;
    });
  }, []);
  const showNotification = useCallback((notif: Notification) => {
    const id = notif.id ?? uuidV7();
    const showTime = Date.now();
    setNotifications((notifs) => {
      const withoutNotif = [...notifs];
      if (notif.id) {
        const deletedIdx = notifs.findIndex(({ id }) => id === notif.id);
        if (deletedIdx >= 0) {
          withoutNotif.splice(deletedIdx, 1);
        }
      }
      return [
        ...withoutNotif,
        {
          ...notif,
          showTime,
          id,
        },
      ];
    });
    if (notif.autoHide) {
      if (notif.id) {
        const timeoutId = timeoutIds.get(notif.id);
        if (timeoutId) {
          window.clearTimeout(timeoutId);
          timeoutIds.delete(notif.id);
        }
      }
      const timeoutId = window.setTimeout(() => {
        hideNotification(id);
        timeoutIds.delete(id);
      }, 5_000);
      timeoutIds.set(id, timeoutId);
    }
    return id;
  }, []);
  const contextValue = useMemo(
    () => ({
      showNotification,
      hideNotification,
      notifications,
    }),
    [notifications],
  );
  return (
    <NotificationsContext.Provider value={contextValue}>
      {props.children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('Unexpected null NotificationsContext');
  }
  return {
    showNotification: ctx.showNotification,
    hideNotification: ctx.hideNotification,
  };
}

export function useNotificationsDisplay() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('Unexpected null NotificationsContext');
  }
  return {
    notifications: ctx.notifications,
    hideNotification: ctx.hideNotification,
  };
}
