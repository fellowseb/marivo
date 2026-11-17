import { createContext, useContext, useMemo, type PropsWithChildren } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AppRouterOutput } from "@marivo/api";
import { useTRPC } from "../../trpc";
import { Result } from "@marivo/utils";

export type PlayContextData = AppRouterOutput["plays"]["playDetails"];

class PlayNotFound extends Error {
  constructor() {
    super("Play not found");
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
  // Non-suspending on purpose: the page layout (header/top bar) must stay
  // mounted while the play loads — consumers receive `null` meanwhile.
  const query = useQuery(trpc.plays.playDetails.queryOptions({ uri }));
  const playContextData = useMemo<PlayContextResult>(() => {
    if (query.data) return Result.ok(query.data);
    if (query.error) return Result.failure(new PlayNotFound());
    return null;
  }, [query.data, query.error]);
  return <PlayContext.Provider value={playContextData}>{children}</PlayContext.Provider>;
}

export function usePlayContext() {
  return useContext(PlayContext);
}
