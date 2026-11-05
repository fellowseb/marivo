import { v4 as uuidV4 } from "uuid";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useTRPC } from "../../trpc";
import type { LineContent, LineEditableContent } from "./script.models";
import { useScriptUndoRedo } from "./script-undo-redo.context";
import { type ScriptAction } from "./script-state";
import { useScriptContext } from "./script.context";
import { logger } from "../../lib/logger";

export interface ScriptEditionContext {
  insertedLineId: string | null;
  insertHeading: (pos: number, level: number) => void;
  insertCueLine: (pos: number, characterId: string) => void;
  insertFreetextLine: (pos: number, char: string) => void;
  editLineText: (id: string, text: string) => void;
  editLine: (id: string, content: LineEditableContent) => void;
  initDraft: (content: LineContent, text?: string, deleted?: boolean) => void;
  removeLines: (ids: string[]) => void;
  discardChanges: (id: string) => void;
  saveChanges: (id: string) => void;
  saveChangesAsNewVersion: (id: string) => void;
  saveChangesAsSharedDraft: (id: string) => void;
  deleteSharedDraft: (id: string, contentId: string) => void;
  deletePreviousVersion: (id: string, contentId: string) => void;
  applySharedDraftAsNewVersion: (id: string, sharedDraft: LineContent) => void;
  applyPreviousVersionAsNewVersion: (id: string, previousVersion: LineContent) => void;
}

const ScriptEditionContext = createContext<ScriptEditionContext | null>(null);

export interface ScriptEditionContextProviderProps {
  uri: string;
  /** Where the script lives: a personal play or the public collection. */
  from: "play" | "collection";
}

export function ScriptEditionContextProvider(
  props: PropsWithChildren<ScriptEditionContextProviderProps>,
) {
  const context = useScriptContext();
  const trpc = useTRPC();
  const { pushUndoRedo } = useScriptUndoRedo();
  const [insertedLineId, setInsertedLineId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  // Re-sync from the server as soon as a mutation settles, instead of waiting
  // for the next poll tick. This closes the race where the local optimistic
  // update and a pre-commit poll response could interleave.
  const invalidateLatestChanges = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: trpc.script.latestChanges.queryKey() });
  }, [queryClient, trpc]);
  const saveLineContentMutation = useMutation(
    trpc.script.saveLineContent.mutationOptions({ onSettled: invalidateLatestChanges }),
  );
  const deleteLineMutation = useMutation(
    trpc.script.deleteLine.mutationOptions({ onSettled: invalidateLatestChanges }),
  );
  const deleteLineContentMutation = useMutation(
    trpc.script.deleteLineContent.mutationOptions({ onSettled: invalidateLatestChanges }),
  );
  const createLineMutation = useMutation(
    trpc.script.createLine.mutationOptions({ onSettled: invalidateLatestChanges }),
  );

  function buildContentPayload(content: LineContent) {
    return {
      lineType: content.lineType,
      text: "text" in content ? content.text : "",
      ...(content.lineType === "chartext" ? { characters: content.characters } : {}),
      ...(content.lineType === "heading" ? { headingLevel: content.headingLevel } : {}),
    } as const;
  }
  const insertHeading = useCallback(
    (pos: number, level: number) => {
      if (!context) {
        const error = new Error("Unexpected undefined script context");
        logger.warn("unexpected error in script edition", { error });
        throw error;
      }
      const id = uuidV4();
      const lastModifiedDate = new Date(Date.now());
      const action = {
        type: "INSERT_HEADING_LINE",
        id,
        lastModifiedDate,
        pos,
        level,
      } as const satisfies ScriptAction;
      context.dispatch(action);
      // Persist the line server-side so saving its content doesn't hit the
      // lines_contents -> lines foreign key
      createLineMutation.mutate({ uri: props.uri, from: props.from, lineId: id, lineType: "heading", position: pos });
      const undoAction = {
        type: "UNDO_INSERT_HEADING_LINE",
        id,
        lastModifiedDate: context.lastModifiedDate,
      } as const satisfies ScriptAction;
      pushUndoRedo({
        dispatch: context.dispatch,
        undoAction,
        redoAction: action,
        label: "Insert heading",
      });
      setInsertedLineId(id);
    },
    [context?.lastModifiedDate, props.uri, createLineMutation],
  );
  const insertCueLine = useCallback(
    (pos: number, characterId: string) => {
      if (!context) {
        const error = new Error("Unexpected undefined script context");
        logger.warn("unexpected error in script edition", { error });
        throw error;
      }
      const id = uuidV4();
      const lastModifiedDate = new Date(Date.now());
      const action = {
        type: "INSERT_CUE_LINE",
        id,
        lastModifiedDate,
        pos,
        characterId,
      } as const satisfies ScriptAction;
      context.dispatch(action);
      createLineMutation.mutate({ uri: props.uri, from: props.from, lineId: id, lineType: "chartext", position: pos });
      const undoAction = {
        type: "UNDO_INSERT_CUE_LINE",
        id,
        lastModifiedDate: context.lastModifiedDate,
      } as const satisfies ScriptAction;
      pushUndoRedo({
        dispatch: context.dispatch,
        redoAction: action,
        undoAction,
        label: `Insert cue line (${context.characters[characterId]})`,
      });
      setInsertedLineId(id);
    },
    [context?.characters, context?.lastModifiedDate, props.uri, createLineMutation],
  );
  const insertFreetextLine = useCallback(
    (pos: number, init: string) => {
      if (!context) {
        const error = new Error("Unexpected undefined script context");
        logger.warn("unexpected error in script edition", { error });
        throw error;
      }
      const id = uuidV4();
      const lastModifiedDate = new Date(Date.now());
      const action = {
        type: "INSERT_FREETEXT_LINE",
        id,
        lastModifiedDate,
        pos,
        init,
      } as const;
      context.dispatch(action);
      createLineMutation.mutate({ uri: props.uri, from: props.from, lineId: id, lineType: "freetext", position: pos });
      const undoAction = {
        type: "UNDO_INSERT_FREETEXT_LINE",
        id,
        lastModifiedDate: context.lastModifiedDate,
      } as const satisfies ScriptAction;
      pushUndoRedo({
        redoAction: action,
        undoAction,
        dispatch: context.dispatch,
        label: "Insert free text line",
      });
      setInsertedLineId(id);
    },
    [context?.lastModifiedDate, props.uri, createLineMutation],
  );
  const initDraft = useCallback(
    (content: LineContent, text?: string, deleted?: boolean) => {
      if (!context) {
        const error = new Error("Unexpected undefined script context");
        logger.warn("unexpected error in script edition", { error });
        throw error;
      }
      const lastModifiedDate = new Date(Date.now());
      const action = {
        type: "INIT_DRAFT",
        lastModifiedDate,
        content,
        text,
        deleted,
      } as const satisfies ScriptAction;
      const line = context.lines.get(content.lineId);
      if (!line) {
        throw new Error("Line not found");
      }
      const undoAction = {
        type: "UNDO_INIT_DRAFT",
        lineId: line.id,
        lastModifiedDate: context.lastModifiedDate,
      } as const satisfies ScriptAction;
      context.dispatch(action);
      const lineType = line.type;
      pushUndoRedo({
        redoAction: action,
        undoAction,
        dispatch: context.dispatch,
        label:
          lineType === "chartext"
            ? `Edit cue line`
            : lineType === "heading"
              ? "Edit heading line"
              : "Edit free text line",
      });
    },
    [context?.lines, context?.lastModifiedDate],
  );
  const editLineText = useCallback(
    (id: string, text: string) => {
      if (!context) {
        const error = new Error("Unexpected undefined script context");
        logger.warn("unexpected error in script edition", { error });
        throw error;
      }
      const lastModifiedDate = new Date(Date.now());
      const action = {
        type: "EDIT_LINE",
        lastModifiedDate,
        id,
        text,
      } as const satisfies ScriptAction;
      const currLine = context.lineContents.get(id);
      if (!currLine) {
        throw new Error("Content not found for edit");
      }
      const undoAction = {
        type: "UNDO_EDIT_LINE",
        id,
        lineLastModifiedDate: currLine.lastModifiedDate,
        lastModifiedDate: context.lastModifiedDate,
        text: currLine.text,
      } as const satisfies ScriptAction;
      context.dispatch(action);
      pushUndoRedo({
        redoAction: action,
        undoAction,
        dispatch: context.dispatch,
        label:
          currLine.lineType === "chartext"
            ? `Edit cue line (${currLine.characters.map((cid) => context.characters[cid]).join(",")})`
            : currLine.lineType === "heading"
              ? "Edit heading line"
              : "Edit free text line",
      });
    },
    [context?.lineContents, context?.characters, context?.lastModifiedDate],
  );
  const editLine = useCallback(
    (id: string, content: LineEditableContent) => {
      if (!context) {
        const error = new Error("Unexpected undefined script context");
        logger.warn("unexpected error in script edition", { error });
        throw error;
      }
      const lastModifiedDate = new Date(Date.now());
      const action = {
        type: "EDIT",
        lastModifiedDate,
        id,
        content,
      } as const satisfies ScriptAction;
      let currLine = context.lineContents.get(id);
      if (!currLine) {
        const currVersionId = (context.lineToContents.get(id)?.versions ?? [])
          .slice()
          .reverse()
          .filter(Boolean)[0];
        if (currVersionId) {
          currLine = context.lineContents.get(currVersionId);
        }
      }
      if (!currLine) {
        throw new Error("Content not found for edit");
      }
      const undoAction = {
        type: "UNDO_EDIT",
        id,
        lastModifiedDate: context.lastModifiedDate,
        content: currLine,
      } as const satisfies ScriptAction;
      context.dispatch(action);
      pushUndoRedo({
        redoAction: action,
        undoAction,
        dispatch: context.dispatch,
        label:
          currLine.lineType === "chartext"
            ? `Edit cue line (${currLine.characters.map((cid) => context.characters[cid]).join(",")})`
            : currLine.lineType === "heading"
              ? "Edit heading line"
              : "Edit free text line",
      });
      // Persist edit to server as the line's per-user draft (upserted in
      // place on every edit by the server, so it never shows up as a
      // shared draft and is only visible to its author)
      const draftContent = { ...currLine, ...content, type: "draft" as const };
      saveLineContentMutation.mutate({
        uri: props.uri, from: props.from,
        lineId: id,
        content: buildContentPayload(draftContent as LineContent),
        contentType: "draft",
        version: null,
      });
    },
    [context?.lineContents, context?.characters, context?.lastModifiedDate, props.uri, saveLineContentMutation],
  );

  const removeLines = useCallback((ids: string[]) => {
    if (!context) {
      const error = new Error("Unexpected undefined script context");
      logger.warn("unexpected error in script edition", { error });
      throw error;
    }
    context.dispatch({
      type: "REMOVE_LINES",
      ids,
    });
    // Persist deletions to server
    for (const id of ids) {
      deleteLineMutation.mutate({ uri: props.uri, from: props.from, lineId: id });
    }
  }, [props.uri, deleteLineMutation]);
  const discardChanges = useCallback(
    (id: string) => {
      if (!context) {
        const error = new Error("Unexpected undefined script context");
        logger.warn("unexpected error in script edition", { error });
        throw error;
      }
      const lastModifiedDate = new Date(Date.now());
      const action = {
        type: "DISCARD_CHANGES",
        id,
        lastModifiedDate,
      } as const satisfies ScriptAction;
      const content = context.lineContents.get(id)!;
      const undoAction = {
        type: "UNDO_DISCARD_CHANGES",
        id,
        content,
        lastModifiedDate: context.lastModifiedDate,
      } as const satisfies ScriptAction;
      context.dispatch(action);
      pushUndoRedo({
        redoAction: action,
        undoAction,
        label: "Discard line changes",
        dispatch: context.dispatch,
      });
    },
    [context?.lineContents, context?.lastModifiedDate],
  );
  const saveChanges = useCallback(
    (id: string) => {
      if (!context) {
        const error = new Error("Unexpected undefined script context");
        logger.warn("unexpected error in script edition", { error });
        throw error;
      }
      const action = {
        type: "SAVE_CHANGES",
        id,
      } as const as ScriptAction;
      context.dispatch(action);
      // Persist to server via API
      const content = context.lineContents.get(id);
      if (content && content.type === "draft") {
        // Overwrite the current latest version in place: send its id and
        // version so the server upserts the same row (no duplicate version).
        const latestVersionId = context.lineToContents
          .get(id)
          ?.versions.slice()
          .reverse()
          .find(Boolean);
        const latestVersion = latestVersionId
          ? context.lineContents.get(latestVersionId)
          : undefined;
        saveLineContentMutation.mutate({
          uri: props.uri, from: props.from,
          lineId: id,
          content: {
            lineType: content.lineType,
            text: "text" in content ? content.text : "",
            ...(content.lineType === "chartext" ? { characters: content.characters } : {}),
            ...(content.lineType === "heading" ? { headingLevel: content.headingLevel } : {}),
          },
          contentType: "saved_version",
          version: latestVersion?.version ?? null,
          contentId: latestVersion?.id,
        });
      }
    },
    [context, props.uri, saveLineContentMutation],
  );
  const saveChangesAsNewVersion = useCallback((id: string) => {
    if (!context) {
      const error = new Error("Unexpected undefined script context");
      logger.warn("unexpected error in script edition", { error });
      throw error;
    }
    const contentId = uuidV4();
    const action = {
      type: "SAVE_CHANGES_AS_NEW_VERSION",
      id,
      contentId,
    } as const as ScriptAction;
    // Capture the draft content BEFORE dispatch (reducer moves it to a new version id)
    const content = context.lineContents.get(id);
    context.dispatch(action);
    // Persist to server as new saved version, reusing the optimistic content
    // id so the server row and the local entry share the same id
    if (content && content.type === "draft") {
      saveLineContentMutation.mutate({
        uri: props.uri, from: props.from,
        lineId: id,
        contentId,
        content: buildContentPayload(content),
        contentType: "saved_version",
        version: null,
      });
    }
  }, [context, props.uri, saveLineContentMutation]);
  const saveChangesAsSharedDraft = useCallback((id: string) => {
    if (!context) {
      const error = new Error("Unexpected undefined script context");
      logger.warn("unexpected error in script edition", { error });
      throw error;
    }
    const contentId = uuidV4();
    const action = {
      type: "SAVE_CHANGES_AS_SHARED_DRAFT",
      id,
      contentId,
    } as const as ScriptAction;
    // Capture the draft content BEFORE dispatch (reducer moves it to a new draft id)
    const content = context.lineContents.get(id);
    context.dispatch(action);
    // Persist to server as shared draft, reusing the optimistic content id
    if (content && content.type === "draft") {
      saveLineContentMutation.mutate({
        uri: props.uri, from: props.from,
        lineId: id,
        contentId,
        content: buildContentPayload(content),
        contentType: "shared_draft",
        version: null,
      });
    }
  }, [context, props.uri, saveLineContentMutation]);
  const deleteSharedDraft = useCallback((id: string, contentId: string) => {
    if (!context) {
      const error = new Error("Unexpected undefined script context");
      logger.warn("unexpected error in script edition", { error });
      throw error;
    }
    const action = {
      type: "DELETE_SHARED_DRAFT",
      id,
      contentId,
    } as const as ScriptAction;
    context.dispatch(action);
    // Persist deletion to server
    deleteLineContentMutation.mutate({ uri: props.uri, from: props.from, lineId: id, contentId });
  }, [context, props.uri, deleteLineContentMutation]);
  const deletePreviousVersion = useCallback((id: string, contentId: string) => {
    if (!context) {
      logger.warn("unexpected undefined script context");
      return;
    }
    const action = {
      type: "DELETE_PREVIOUS_VERSION",
      id,
      contentId,
    } as const as ScriptAction;
    context.dispatch(action);
    // Persist deletion to server
    deleteLineContentMutation.mutate({ uri: props.uri, from: props.from, lineId: id, contentId });
  }, [context, props.uri, deleteLineContentMutation]);
  const applySharedDraftAsNewVersion = useCallback((id: string, sharedDraft: LineContent) => {
    if (!context) {
      const error = new Error("Unexpected undefined script context");
      logger.warn("unexpected error in script edition", { error });
      throw error;
    }
    const contentId = uuidV4();
    const lastModifiedDate = new Date(Date.now());
    const action = {
      type: "APPLY_SHARED_DRAFT_AS_NEW_VERSION",
      id,
      contentId,
      sharedDraft,
      lastModifiedDate,
    } as const as ScriptAction;
    context.dispatch(action);
    // Persist to server as new saved version
    saveLineContentMutation.mutate({
      uri: props.uri, from: props.from,
      lineId: id,
      contentId,
      content: buildContentPayload(sharedDraft),
      contentType: "saved_version",
      version: null,
    });
  }, [context, props.uri, saveLineContentMutation]);
  const applyPreviousVersionAsNewVersion = useCallback(
    (id: string, previousVersion: LineContent) => {
      if (!context) {
        const error = new Error("Unexpected undefined script context");
        logger.warn("unexpected error in script edition", { error });
        throw error;
      }
      const contentId = uuidV4();
      const lastModifiedDate = new Date(Date.now());
      const action = {
        type: "APPLY_PREVIOUS_VERSION_AS_NEW_VERSION",
        id,
        contentId,
        previousVersion,
        lastModifiedDate,
      } as const as ScriptAction;
      context.dispatch(action);
      // Persist to server as new saved version
      saveLineContentMutation.mutate({
        uri: props.uri, from: props.from,
        lineId: id,
        contentId,
        content: buildContentPayload(previousVersion),
        contentType: "saved_version",
        version: null,
      });
    },
    [context, props.uri, saveLineContentMutation],
  );
  const contextValue = useMemo(
    () =>
      ({
        insertHeading,
        insertCueLine,
        insertFreetextLine,
        insertedLineId,
        initDraft,
        editLineText,
        editLine,
        removeLines,
        discardChanges,
        saveChanges,
        saveChangesAsNewVersion,
        saveChangesAsSharedDraft,
        deleteSharedDraft,
        deletePreviousVersion,
        applySharedDraftAsNewVersion,
        applyPreviousVersionAsNewVersion,
      }) satisfies ScriptEditionContext,
    [
      insertedLineId,
      insertHeading,
      insertCueLine,
      insertFreetextLine,
      initDraft,
      editLineText,
      editLine,
      removeLines,
      discardChanges,
      saveChanges,
      saveChangesAsNewVersion,
      saveChangesAsSharedDraft,
      deleteSharedDraft,
      deletePreviousVersion,
      applySharedDraftAsNewVersion,
      applyPreviousVersionAsNewVersion,
    ],
  );
  return (
    <ScriptEditionContext.Provider value={contextValue}>
      {props.children}
    </ScriptEditionContext.Provider>
  );
}

export function useScriptEditionContext() {
  return useContext(ScriptEditionContext);
}
