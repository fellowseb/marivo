import { useEffect } from 'react';

export function useBackgroundSync(params: {
  serviceId: string;
  onRefresh: () => void;
}) {
  useEffect(() => {
    const subscription = window.serviceWorker.messages
      .filter({
        type: 'SYNC_NEEDED',
        serviceId: params.serviceId,
      })
      .subscribe(() => {
        params.onRefresh();
      });
    return () => {
      subscription.unsubscribe();
    };
  });
}
