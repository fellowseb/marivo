import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from 'react';
import { useTRPC } from '../../trpc';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import Icon from '../../components/icon.component';
import DotsLoader from '../../components/dots-loader';

export const PlayContext = createContext<{
  title: string;
  uri: string;
} | null>(null);

export function PlayContextProvider(
  props: PropsWithChildren<{
    uri: string;
  }>,
) {
  const { uri, children } = props;
  const trpc = useTRPC();
  const query = useQuery(trpc.plays.playDetails.queryOptions({ uri }));
  const details = query.data?.details;
  const playContextData = useMemo(() => {
    if (!uri || !details) {
      return null;
    }
    return details;
  }, [uri, details]);
  const navigate = useNavigate();
  if (query.isError) {
    navigate({ pathname: '/' });
    return;
  }
  return (
    <PlayContext.Provider value={playContextData}>
      {query.isPending ? <DotsLoader /> : children}
    </PlayContext.Provider>
  );
}

export function usePlayContext() {
  return useContext(PlayContext);
}
