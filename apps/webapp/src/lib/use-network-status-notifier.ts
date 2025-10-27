import { useEffect } from 'react';
import { onlineManager } from '@tanstack/react-query';
import { useNotifications } from '../components/notifications.context.tsx';

export function useNetworkStatusNotifier() {
  const { showNotification } = useNotifications();
  useEffect(() => {
    return onlineManager.subscribe((isOnline) => {
      showNotification({
        id: 'NetworkStatus',
        message: isOnline
          ? 'Network status change detected: back online !'
          : `Network status change detected: you're offline`,
        icon: isOnline ? 'online' : 'offline',
        type: 'info',
        autoHide: true,
      });
    });
  }, []);
}
