import { v4 as uuidV4 } from 'uuid';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type PropsWithChildren,
} from 'react';
import type { HeadingLine, Line } from '../../components/script.models';
import { assertUnreachable } from '@marivo/utils';
import type { AppRouterOutput } from '@marivo/api';
import { useTRPC } from '../../trpc';
import { useQuery } from '@tanstack/react-query';

export interface ScriptContext {
  lastModifiedDate: Date;
  lines: Map<string, Line>;
  linesOrder: string[];
  insertHeading: (pos: number) => void;
}

export interface ScriptState {
  lastModifiedDate: Date;
  lines: Map<string, Line>;
  linesOrder: string[];
  checksums: Map<string, string>;
  scriptChecksum: string | null;
}

type ScriptAction =
  | {
      type: 'LATEST_CHANGES_DOWNLOADED';
      payload: AppRouterOutput['script']['latestChanges'];
    }
  | {
      type: 'HEADING_INSERTED';
      pos: number;
    };

const ScriptContext = createContext<ScriptContext | null>(null);

function reducer(
  state: ScriptState | null,
  action: ScriptAction,
): ScriptState | null {
  switch (action.type) {
    case 'LATEST_CHANGES_DOWNLOADED': {
      const lines = action.payload.diffs.reduce((acc, curr) => {
        if (curr.change.type === 'delete') {
          acc.delete(curr.id);
        } else if (curr.change.type === 'create_update') {
          acc.set(curr.id, {
            id: curr.id,
            version: curr.version,
            ...(curr.previousVersionsIds
              ? { previousVersionsIds: curr.previousVersionsIds }
              : {}),
            lastModifiedDate: curr.lastModifiedDate,
            ...curr.change.content,
          } satisfies Line);
        } else {
          assertUnreachable(curr.change);
        }
        return acc;
      }, state?.lines ?? new Map());
      const lastModifiedDate =
        state?.lastModifiedDate.getTime() !==
        action.payload.lastModifiedDate.getTime()
          ? action.payload.lastModifiedDate
          : state.lastModifiedDate;
      // TODO: compare linesOrder
      return {
        lastModifiedDate,
        lines,
        linesOrder: action.payload.linesOrder,
        checksums: state?.checksums ?? new Map(),
        scriptChecksum: state?.scriptChecksum ?? null,
      };
    }
    case 'HEADING_INSERTED': {
      if (!state) {
        return state;
      }
      const id = uuidV4();
      const lines = state.lines;
      lines.set(id, {
        type: 'heading',
        lastModifiedDate: new Date(Date.now()),
        text: 'Scène',
        version: 0,
        headingLevel: 2,
        id: id,
      } satisfies HeadingLine);
      const linesOrder = [
        ...state.linesOrder.slice(0, action.pos),
        id,
        ...state.linesOrder.slice(action.pos),
      ];
      return {
        lastModifiedDate: state.lastModifiedDate,
        lines,
        linesOrder,
        checksums: state.checksums,
        scriptChecksum: state.scriptChecksum,
      };
    }
    default:
      assertUnreachable(action);
  }
}

export interface ScriptContextProps {
  playUri: string;
}

export function ScriptContextProvider(
  props: PropsWithChildren<ScriptContextProps>,
) {
  const [state, dispatch] = useReducer<ScriptState | null, [ScriptAction]>(
    reducer,
    null,
  );
  const insertHeading = useCallback(
    (pos: number) => {
      dispatch({
        type: 'HEADING_INSERTED',
        pos,
      });
    },
    [dispatch],
  );
  const contextValue = useMemo(
    () =>
      state?.lastModifiedDate
        ? ({
            lines: state.lines,
            lastModifiedDate: state.lastModifiedDate,
            linesOrder: state.linesOrder,
            insertHeading,
          } satisfies ScriptContext)
        : null,
    [state?.linesOrder, state?.lastModifiedDate, state?.lines],
  );
  const trpc = useTRPC();
  const query = useQuery(
    trpc.script.latestChanges.queryOptions({
      since: state?.lastModifiedDate ?? new Date(0),
      playUri: props.playUri,
    }),
  );
  useEffect(() => {
    if (query.isSuccess && query.data) {
      dispatch({
        type: 'LATEST_CHANGES_DOWNLOADED',
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
