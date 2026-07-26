import { useQuery } from '@tanstack/react-query';
import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from 'react';
import { useTRPC } from '../../trpc';

interface CollectionMetadataContext {
  genres: string[];
  periods: string[];
  count: number;
}

const CollectionMetadataContext = createContext<CollectionMetadataContext>({
  genres: [],
  periods: [],
  count: 0,
});

export function CollectionMetadataContextProvider(props: PropsWithChildren) {
  const trpc = useTRPC();
  const { isSuccess, data } = useQuery(
    trpc.playsCollection.getMetadata.queryOptions(),
  );
  const context = useMemo<CollectionMetadataContext>(
    () => ({
      genres: isSuccess ? data.genres : [],
      periods: isSuccess ? data.periods : [],
      count: isSuccess ? data.count : 0,
    }),
    [data, isSuccess],
  );
  return (
    <CollectionMetadataContext.Provider value={context}>
      {props.children}
    </CollectionMetadataContext.Provider>
  );
}

export function useCollectionMetadataContext() {
  const context = useContext(CollectionMetadataContext);
  return context;
}
