import { useIsMutating, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { useTRPC } from "../../trpc";
import type { Line, LineContent } from "./script.models";
import { loadScriptState, saveScriptState } from "./script-persistence";
import { reducer, type LineContents, type ScriptAction, type ScriptState } from "./script-state";

export interface ScriptContext {
  readonly lastModifiedDate: Date;
  readonly remoteLastModifiedDate: Date;
  readonly lines: Map<string, Line>;
  readonly lineContents: Map<string, LineContent>;
  readonly lineToContents: Map<string, LineContents>;
  readonly linesOrder: string[];
  readonly characters: { [id: string]: string };
  readonly outline: { heading: string; headingLevel: number }[];
  // Exposed for undo/redo
  dispatch: (action: ScriptAction) => void;
}

const ScriptContext = createContext<ScriptContext | null>(null);
export interface ScriptContextProps {
  uri: string;
  from: "play" | "import" | "collection";
}

const initialState = {
  lastModifiedDate: new Date(),
  // Epoch: the provider always does a full load on mount, which sets the real
  // server date. Starting at epoch ensures the stale-payload guard in the
  // reducer never drops the initial full load.
  remoteLastModifiedDate: new Date(0),
  lines: new Map(),
  lineContents: new Map(),
  linesOrder: [],
  characters: {},
  checksums: new Map(),
  scriptChecksum: null,
  lineToContents: new Map(),
  outline: [],
} satisfies ScriptState;

export function ScriptContextProvider(props: PropsWithChildren<ScriptContextProps>) {
  // Load persisted state from localStorage as initial state
  const persistedInitialState = useMemo(() => {
    return loadScriptState(props.uri, props.from) ?? initialState;
  }, [props.uri, props.from]);

  const [state, dispatch] = useReducer<ScriptState, [ScriptAction]>(reducer, persistedInitialState);

  // Track previous uri/from to detect navigation and save state
  const prevUriRef = useRef<string | null>(null);
  const prevFromRef = useRef<string | null>(null);

  // Save state to localStorage whenever it changes (debounced via effect)
  useEffect(() => {
    saveScriptState(state, props.uri, props.from);
  }, [state, props.uri, props.from]);

  const contextValue = useMemo(
    () =>
      ({
        lines: state.lines,
        lineContents: state.lineContents,
        lineToContents: state.lineToContents,
        lastModifiedDate: state.lastModifiedDate,
        remoteLastModifiedDate: state.remoteLastModifiedDate,
        linesOrder: state.linesOrder,
        characters: state.characters,
        outline: state.outline,
        dispatch,
      }) satisfies ScriptContext,
    [
      state.lines,
      state.lineContents,
      state.lineToContents,
      state.lastModifiedDate,
      state.remoteLastModifiedDate,
      state.linesOrder,
      state.characters,
      state.outline,
      dispatch,
    ],
  );
  const trpc = useTRPC();
  const query = useSuspenseQuery(
    trpc.script.latestChanges.queryOptions({
      since: new Date(0),
      uri: props.uri,
      from: props.from,
    }),
  );
  // Poll for server changes every 10s so versions saved by other clients appear.
  // `since` advances to the newest server date we have seen, so each tick only
  // fetches fresh diffs instead of replaying everything since the full load.
  const [lastPollDate, setLastPollDate] = useState<Date | null>(null);
  const since = useMemo(() => {
    const dates = [lastPollDate, query.data?.lastModifiedDate].filter(
      (d): d is Date => d instanceof Date,
    );
    return dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : new Date(0);
  }, [lastPollDate, query.data?.lastModifiedDate]);
  // Pause polling while a script mutation is in flight: a poll response that
  // reflects the server state from *before* the mutation committed would
  // otherwise overwrite the local optimistic update (race condition).
  const pendingScriptMutations = useIsMutating({
    predicate: (mutation) => {
      const path = mutation.options.mutationKey?.[0];
      return Array.isArray(path) && path[0] === "script";
    },
  });
  const pollQuery = useQuery({
    ...trpc.script.latestChanges.queryOptions({
      since,
      uri: props.uri,
      from: props.from,
    }),
    refetchInterval: 10_000,
    enabled: pendingScriptMutations === 0,
  });
  useEffect(() => {
    if (pollQuery.data) {
      setLastPollDate(pollQuery.data.lastModifiedDate);
      dispatch({ type: "PROCESS_LATEST_CHANGES_PAYLOAD", payload: pollQuery.data });
    }
  }, [pollQuery.data]);
  // Reset state when uri or from changes (navigation between plays)
  useEffect(() => {
    // Save previous state before resetting
    if (prevUriRef.current !== null && prevFromRef.current !== null) {
      saveScriptState(state, prevUriRef.current, prevFromRef.current);
    }
    prevUriRef.current = props.uri;
    prevFromRef.current = props.from;
    dispatch({ type: "RESET", payload: persistedInitialState });
  }, [props.uri, props.from]);
  useEffect(() => {
    dispatch({
      type: "PROCESS_LATEST_CHANGES_PAYLOAD",
      payload: query.data,
    });
  }, [query.data]);
  return <ScriptContext.Provider value={contextValue}>{props.children}</ScriptContext.Provider>;
}

export function useScriptContext() {
  return useContext(ScriptContext);
}
