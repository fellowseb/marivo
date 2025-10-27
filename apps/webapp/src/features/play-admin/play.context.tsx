import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from 'react';
import { useTRPC } from '../../trpc';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import type { AppRouterOutput } from '@marivo/api';

export type PlayContextData = AppRouterOutput['plays']['playDetails'];

export const PlayContext = createContext<PlayContextData | null>(null);

export function PlayContextProvider(
  props: PropsWithChildren<{
    uri: string;
  }>,
) {
  const { uri, children } = props;
  const trpc = useTRPC();
  const query = useQuery(trpc.plays.playDetails.queryOptions({ uri }));
  const { data } = query;
  const playContextData = useMemo(() => {
    if (!uri || !data) {
      return null;
    }
    return data;
  }, [uri, data]);
  const navigate = useNavigate();
  if (query.isError) {
    navigate({ pathname: '/' });
    return;
  }
  return (
    <PlayContext.Provider value={playContextData}>
      {children}
    </PlayContext.Provider>
  );
}

export function usePlayContext() {
  return useContext(PlayContext);
}
