import { useQuery } from '@tanstack/react-query';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type PropsWithChildren,
} from 'react';
import { useTRPC } from '../../trpc';
import type { Line, LineContent } from './script.models';
import {
  reducer,
  type LineContents,
  type ScriptAction,
  type ScriptState,
} from './script-state';

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
  from: 'play' | 'import';
}

const initialState = {
  lastModifiedDate: new Date(),
  remoteLastModifiedDate: new Date(),
  lines: new Map(),
  lineContents: new Map(),
  linesOrder: [],
  characters: {},
  checksums: new Map(),
  scriptChecksum: null,
  lineToContents: new Map(),
  outline: [],
} satisfies ScriptState;

export function ScriptContextProvider(
  props: PropsWithChildren<ScriptContextProps>,
) {
  const [state, dispatch] = useReducer<ScriptState, [ScriptAction]>(
    reducer,
    initialState,
  );
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
  const query = useQuery(
    trpc.script.latestChanges.queryOptions({
      since: new Date(0),
      uri: props.uri,
      from: props.from,
    }),
  );
  useEffect(() => {
    if (query.isSuccess && query.data) {
      dispatch({
        type: 'PROCESS_LATEST_CHANGES_PAYLOAD',
        payload: query.data,
      });
    }
  }, [query.isSuccess, query.data]); // Lint for missing deps FFS
  return (
    <ScriptContext.Provider value={contextValue}>
      {props.children}
    </ScriptContext.Provider>
  );
}

export function useScriptContext() {
  return useContext(ScriptContext);
}
