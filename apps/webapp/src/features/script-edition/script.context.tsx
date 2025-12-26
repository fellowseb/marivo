import { v4 as uuidV4 } from 'uuid';
import { useQuery } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type PropsWithChildren,
} from 'react';
import type {
  Line,
  LineContent,
  LineEditableContent,
} from '../../components/script.models';
import { useTRPC } from '../../trpc';
import { useScriptUndoRedo } from './script-undo-redo.context';
import { reducer, type ScriptAction, type ScriptState } from './script-state';

export interface ScriptContext {
  lastModifiedDate: Date;
  remoteLastModifiedDate: Date;
  lines: Map<string, Line>;
  lineContents: Map<string, LineContent>;
  linesOrder: string[];
  characters: { [id: string]: string };
  insertHeading: (pos: number, level: number) => string;
  insertCueLine: (pos: number, characterId: string) => string;
  insertFreetextLine: (pos: number, char: string) => string;
  editLineText: (id: string, text: string) => void;
  editLine: (id: string, content: LineEditableContent) => void;
  initDraft: (content: LineContent, text?: string, deleted?: boolean) => void;
  removeLines: (ids: string[]) => void;
  discardChanges: (id: string) => void;
  saveChanges: (id: string) => void;
  saveChangesAsNewVersion: (id: string) => void;
  saveChangesAsSharedDraft: (id: string) => void;
  getLineContentInfo: (line: Line) => LineContentInfo;
  // Exposed for undo/redo
  dispatch: (action: ScriptAction) => void;
}

const ScriptContext = createContext<ScriptContext | null>(null);

export interface ScriptContextProps {
  playUri: string;
}

export interface LineContentInfo {
  content: LineContent;
  hasDraft: boolean;
  hasSharedDraft: boolean;
  hasPreviousVersions: boolean;
  isNewUnsaved: boolean;
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
  const { pushUndoRedo } = useScriptUndoRedo();
  const insertHeading = useCallback(
    (pos: number, level: number) => {
      const id = uuidV4();
      const lastModifiedDate = new Date(Date.now());
      const action = {
        type: 'INSERT_HEADING_LINE',
        id,
        lastModifiedDate,
        pos,
        level,
      } as const satisfies ScriptAction;
      dispatch(action);
      const undoAction = {
        type: 'UNDO_INSERT_HEADING_LINE',
        id,
        lastModifiedDate: state.lastModifiedDate,
      } as const satisfies ScriptAction;
      pushUndoRedo({
        dispatch,
        undoAction,
        redoAction: action,
        label: 'Insert heading',
      });
      return id;
    },
    [state.lastModifiedDate],
  );
  const insertCueLine = useCallback(
    (pos: number, characterId: string) => {
      const id = uuidV4();
      const lastModifiedDate = new Date(Date.now());
      const action = {
        type: 'INSERT_CUE_LINE',
        id,
        lastModifiedDate,
        pos,
        characterId,
      } as const satisfies ScriptAction;
      dispatch(action);
      const undoAction = {
        type: 'UNDO_INSERT_CUE_LINE',
        id,
        lastModifiedDate: state.lastModifiedDate,
      } as const satisfies ScriptAction;
      pushUndoRedo({
        dispatch,
        redoAction: action,
        undoAction,
        label: `Insert cue line (${state.characters[characterId]})`,
      });
      return id;
    },
    [state.characters, state.lastModifiedDate],
  );
  const insertFreetextLine = useCallback(
    (pos: number, init: string) => {
      const id = uuidV4();
      const lastModifiedDate = new Date(Date.now());
      const action = {
        type: 'INSERT_FREETEXT_LINE',
        id,
        lastModifiedDate,
        pos,
        init,
      } as const;
      dispatch(action);
      const undoAction = {
        type: 'UNDO_INSERT_FREETEXT_LINE',
        id,
        lastModifiedDate: state.lastModifiedDate,
      } as const satisfies ScriptAction;
      pushUndoRedo({
        redoAction: action,
        undoAction,
        dispatch,
        label: 'Insert free text line',
      });
      return id;
    },
    [state.lastModifiedDate],
  );
  const initDraft = useCallback(
    (content: LineContent, text?: string, deleted?: boolean) => {
      const lastModifiedDate = new Date(Date.now());
      const action = {
        type: 'INIT_DRAFT',
        lastModifiedDate,
        content,
        text,
        deleted,
      } as const satisfies ScriptAction;
      const line = state.lines.get(content.lineId);
      if (!line) {
        throw new Error('Line not found');
      }
      const undoAction = {
        type: 'UNDO_INIT_DRAFT',
        lineId: line.id,
        lastModifiedDate: state.lastModifiedDate,
      } as const satisfies ScriptAction;
      dispatch(action);
      const lineType = line.type;
      pushUndoRedo({
        redoAction: action,
        undoAction,
        dispatch,
        label:
          lineType === 'chartext'
            ? `Edit cue line`
            : lineType === 'heading'
              ? 'Edit heading line'
              : 'Edit free text line',
      });
    },
    [state.lines, state.lastModifiedDate],
  );
  const editLineText = useCallback(
    (id: string, text: string) => {
      const lastModifiedDate = new Date(Date.now());
      const action = {
        type: 'EDIT_LINE',
        lastModifiedDate,
        id,
        text,
      } as const satisfies ScriptAction;
      const currLine = state.lineContents.get(id);
      if (!currLine) {
        throw new Error('Content not found for edit');
      }
      const undoAction = {
        type: 'UNDO_EDIT_LINE',
        id,
        lineLastModifiedDate: currLine.lastModifiedDate,
        lastModifiedDate: state.lastModifiedDate,
        text: currLine.text,
      } as const satisfies ScriptAction;
      dispatch(action);
      pushUndoRedo({
        redoAction: action,
        undoAction,
        dispatch,
        label:
          currLine.lineType === 'chartext'
            ? `Edit cue line (${currLine.characters.map((cid) => state.characters[cid]).join(',')})`
            : currLine.lineType === 'heading'
              ? 'Edit heading line'
              : 'Edit free text line',
      });
    },
    [state.lineContents, state.characters, state.lastModifiedDate],
  );
  const editLine = useCallback(
    (id: string, content: LineEditableContent) => {
      const lastModifiedDate = new Date(Date.now());
      const action = {
        type: 'EDIT',
        lastModifiedDate,
        id,
        content,
      } as const satisfies ScriptAction;
      let currLine = state.lineContents.get(id);
      if (!currLine) {
        const currVersionId = (state.lineToContents.get(id)?.versions ?? [])
          .slice()
          .reverse()
          .filter(Boolean)[0];
        if (currVersionId) {
          currLine = state.lineContents.get(currVersionId);
        }
      }
      if (!currLine) {
        throw new Error('Content not found for edit');
      }
      const undoAction = {
        type: 'UNDO_EDIT',
        id,
        lastModifiedDate: state.lastModifiedDate,
        content: currLine,
      } as const satisfies ScriptAction;
      dispatch(action);
      pushUndoRedo({
        redoAction: action,
        undoAction,
        dispatch,
        label:
          currLine.lineType === 'chartext'
            ? `Edit cue line (${currLine.characters.map((cid) => state.characters[cid]).join(',')})`
            : currLine.lineType === 'heading'
              ? 'Edit heading line'
              : 'Edit free text line',
      });
    },
    [state.lineContents, state.characters, state.lastModifiedDate],
  );

  const removeLines = useCallback((ids: string[]) => {
    dispatch({
      type: 'REMOVE_LINES',
      ids,
    });
  }, []);
  const discardChanges = useCallback(
    (id: string) => {
      const lastModifiedDate = new Date(Date.now());
      const action = {
        type: 'DISCARD_CHANGES',
        id,
        lastModifiedDate,
      } as const satisfies ScriptAction;
      const content = state.lineContents.get(id)!;
      const undoAction = {
        type: 'UNDO_DISCARD_CHANGES',
        id,
        content,
        lastModifiedDate: state.lastModifiedDate,
      } as const satisfies ScriptAction;
      dispatch(action);
      pushUndoRedo({
        redoAction: action,
        undoAction,
        label: 'Discard line changes',
        dispatch,
      });
    },
    [state.lineContents, state.lastModifiedDate],
  );
  const saveChanges = useCallback((id: string) => {
    const action = {
      type: 'SAVE_CHANGES',
      id,
    } as const as ScriptAction;
    dispatch(action);
  }, []);
  const saveChangesAsNewVersion = useCallback((id: string) => {
    const contentId = uuidV4();
    const action = {
      type: 'SAVE_CHANGES_AS_NEW_VERSION',
      id,
      contentId,
    } as const as ScriptAction;
    dispatch(action);
  }, []);
  const saveChangesAsSharedDraft = useCallback((id: string) => {
    const contentId = uuidV4();
    const action = {
      type: 'SAVE_CHANGES_AS_SHARED_DRAFT',
      id,
      contentId,
    } as const as ScriptAction;
    dispatch(action);
  }, []);
  const getLineContentInfo = (line: Line): LineContentInfo => {
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
    return {
      content,
      hasDraft: !!draftContent,
      hasSharedDraft,
      hasPreviousVersions,
      isNewUnsaved,
    };
  };
  const contextValue = useMemo(
    () =>
      ({
        lines: state.lines,
        lineContents: state.lineContents,
        lastModifiedDate: state.lastModifiedDate,
        remoteLastModifiedDate: state.remoteLastModifiedDate,
        linesOrder: state.linesOrder,
        characters: state.characters,
        insertHeading,
        insertCueLine,
        insertFreetextLine,
        initDraft,
        editLineText,
        editLine,
        removeLines,
        dispatch,
        getLineContentInfo,
        discardChanges,
        saveChanges,
        saveChangesAsNewVersion,
        saveChangesAsSharedDraft,
      }) satisfies ScriptContext,
    [state],
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
