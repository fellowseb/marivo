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
import type { Line, LineContent, LineInfo } from './script.models';
import {
  reducer,
  type LineContents,
  type ScriptAction,
  type ScriptState,
} from './script-state';

export interface ScriptContext {
  lastModifiedDate: Date;
  remoteLastModifiedDate: Date;
  lines: Map<string, Line>;
  lineContents: Map<string, LineContent>;
  lineToContents: Map<string, LineContents>;
  linesOrder: string[];
  characters: { [id: string]: string };
  getLineContentForDisplayWithInfo: (line: Line) => [LineContent, LineInfo];
  getLineSharedDrafts: (line: Line) => LineContent[];
  getLinePreviousVersions: (line: Line) => LineContent[];
  // Exposed for undo/redo
  dispatch: (action: ScriptAction) => void;
}

const ScriptContext = createContext<ScriptContext | null>(null);
export interface ScriptContextProps {
  playUri: string;
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
};

export function ScriptContextProvider(
  props: PropsWithChildren<ScriptContextProps>,
) {
  const [state, dispatch] = useReducer<ScriptState, [ScriptAction]>(
    reducer,
    initialState,
  );
  const getLinePreviousVersions = (line: Line): LineContent[] => {
    const { id } = line;
    const contents = state.lineToContents.get(id);
    const previousVersions = contents?.versions
      .filter(Boolean)
      .reverse()
      .slice(1);
    return contents
      ? (previousVersions?.map((contentId) => {
          return state.lineContents.get(contentId)!;
        }) ?? [])
      : [];
  };
  const getLineSharedDrafts = (line: Line): LineContent[] => {
    const { id } = line;
    const contents = state.lineToContents.get(id);
    return contents
      ? contents.sharedDrafts.map((contentId) => {
          return state.lineContents.get(contentId)!;
        })
      : [];
  };
  const getLineContentForDisplayWithInfo = (
    line: Line,
  ): [LineContent, LineInfo] => {
    let content;
    const { id } = line;
    // Check for presence of a draft content item
    const draftContent = state.lineContents.get(id);
    if (draftContent) {
      content = draftContent;
    }
    const contents = state.lineToContents.get(id);
    let hasSharedDraft = false;
    let hasPreviousVersions = false;
    let isNewUnsaved = false;
    // Check for prensence of versionned content items
    if (contents) {
      const { versions, sharedDrafts } = contents;
      const presentVersions = versions.filter(Boolean).reverse().slice();
      if (!content && presentVersions.length) {
        const latestVersionContent = state.lineContents.get(
          presentVersions[0] ?? '',
        );
        if (latestVersionContent) {
          content = latestVersionContent;
        }
      }
      hasSharedDraft = sharedDrafts.length > 0;
      hasPreviousVersions = presentVersions.length > 1;
      isNewUnsaved = presentVersions.length === 0;
    }
    if (!content) {
      throw new Error('No line content found');
    }
    return [
      content,
      {
        hasDraft: !!draftContent,
        hasSharedDraft,
        hasPreviousVersions,
        isNewUnsaved,
      },
    ];
  };
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
        dispatch,
        getLineContentForDisplayWithInfo,
        getLineSharedDrafts,
        getLinePreviousVersions,
      }) satisfies ScriptContext,
    [
      state.lines,
      state.lineContents,
      state.lineToContents,
      state.lastModifiedDate,
      state.remoteLastModifiedDate,
      state.linesOrder,
      state.characters,
      dispatch,
      getLineContentForDisplayWithInfo,
      getLineSharedDrafts,
      getLinePreviousVersions,
    ],
  );
  const trpc = useTRPC();
  const query = useQuery(
    trpc.script.latestChanges.queryOptions({
      since: state.remoteLastModifiedDate,
      playUri: props.playUri,
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
