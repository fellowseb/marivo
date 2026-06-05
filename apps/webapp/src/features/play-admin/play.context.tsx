import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type PropsWithChildren,
} from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import type { AppRouterOutput } from '@marivo/api';
import { useTRPC } from '../../trpc';
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
  const trpc = useTRPC();
  const query = useSuspenseQuery(trpc.plays.playDetails.queryOptions({ uri }));
  const playContextData = useMemo(() => {
    return Result.ok(query.data);
  }, [query.data]);
  return (
    <PlayContext.Provider value={playContextData}>
      {children}
    </PlayContext.Provider>
  );
}

export function usePlayContext() {
  return useContext(PlayContext);
}
