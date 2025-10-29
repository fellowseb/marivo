import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type PropsWithChildren,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import type { AppRouterOutput } from '@marivo/api';
import { useTRPC } from '../../trpc';
import { useNotifications } from '../../components/notifications.context.tsx';
import { Result } from '@marivo/utils';

export type PlayContextData = AppRouterOutput['plays']['playDetails'];

class PlayNotFound extends Error {
  constructor() {
    super('Play not found');
  }
}

export type PlayContextResult = Result<PlayContextData, PlayNotFound> | null;

export const PlayContext = createContext<PlayContextResult>(null);

export function PlayContextProvider(
  props: PropsWithChildren<{
    uri: string;
  }>,
) {
  const { uri, children } = props;
  const { showNotification } = useNotifications();
  const trpc = useTRPC();
  const query = useQuery(trpc.plays.playDetails.queryOptions({ uri }));
  const { data, error } = query;
  const playContextData = useMemo(() => {
    if (!uri || (error && error.data?.code === 'NOT_FOUND')) {
      return Result.failure(new PlayNotFound());
    }
    if (!data) {
      return null;
    }
    return Result.ok(data);
  }, [uri, data, error]);
  const navigate = useNavigate();
  useEffect(() => {
    if (query.isError) {
      if (query.error.data?.code !== 'NOT_FOUND') {
        showNotification({
          autoHide: true,
          message: 'Something unexpected happened',
          type: 'error',
        });
        navigate({ pathname: '/' });
      }
    }
  }, [query.isError]);
  return (
    <PlayContext.Provider value={playContextData}>
      {children}
    </PlayContext.Provider>
  );
}

export function usePlayContext() {
  return useContext(PlayContext);
}
