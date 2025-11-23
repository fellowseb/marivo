import { useState, type ActionDispatch } from 'react';

export interface UndoRedoStackItem<TAction> {
  action: TAction;
  dispatch: ActionDispatch<[TAction]>;
}

export interface UndoRedoState<TAction> {
  undoStack: UndoRedoStackItem<TAction>[];
  redoStack: UndoRedoStackItem<TAction>[];
  labels: string[];
  position: number;
}

export interface UndoRedoContext<TAction> {
  pushUndoRedo: (params: {
    undoAction: TAction;
    redoAction: TAction;
    label: string;
    dispatch: ActionDispatch<[TAction]>;
  }) => void;
  undo: (count: number) => void;
  redo: (count: number) => void;
  getUndoItems: () => { label: string }[];
  getRedoItems: () => { label: string }[];
}

/**
 *
 * +---------------+ 3 +---------------+
 * | undo action 3 |   | redo action 3 |
 * +---------------+ 2 +---------------+
 * | undo action 2 |   | redo action 2 |
 * +---------------+ 1 +---------------+
 * | undo action 1 |   | redo action 1 |
 * +---------------+ 0 +---------------+
 *
 */

export function useUndoRedo<TAction>() {
  const [state, setState] = useState<UndoRedoState<TAction>>({
    undoStack: [],
    redoStack: [],
    labels: [],
    position: 0,
  });
  const pushUndoRedo = ({
    undoAction,
    redoAction,
    dispatch,
    label,
  }: {
    undoAction: TAction;
    redoAction: TAction;
    dispatch: ActionDispatch<[TAction]>;
    label: string;
  }) => {
    setState((prev) => ({
      undoStack: [
        ...prev.undoStack.slice(0, prev.position),
        {
          action: undoAction,
          dispatch,
        },
      ],
      redoStack: [
        ...prev.redoStack.slice(0, prev.position),
        {
          action: redoAction,
          dispatch,
        },
      ],
      labels: [...prev.labels.slice(0, prev.position), label],
      position: prev.position + 1,
    }));
  };
  const undoItems = state.undoStack.slice(0, state.position).reverse();
  const undoLabels = state.labels.slice(0, state.position).reverse();
  const undo = (count: number = 1) => {
    if (count <= 0 || count > undoItems.length) {
      throw new Error('Undo: range error');
    }
    for (let idx = 0; idx < undoItems.length && idx < count; ++idx) {
      const { action, dispatch } = undoItems[idx];
      dispatch(action);
      setState((prev) => ({
        ...prev,
        position: prev.position - count,
      }));
    }
  };
  const getUndoItems = () => undoLabels.map((label) => ({ label }));

  const redoItems = state.redoStack.slice(state.position);
  const redoLabels = state.labels.slice(state.position);
  const redo = (count: number = 1) => {
    if (count <= 0 || count > redoItems.length) {
      throw new Error('Redo: range error');
    }
    for (let idx = 0; idx < redoItems.length && idx < count; ++idx) {
      const { action, dispatch } = redoItems[idx];
      dispatch(action);
      setState((prev) => ({
        ...prev,
        position: prev.position + count,
      }));
    }
  };
  const getRedoItems = () => redoLabels.map((label) => ({ label }));
  return { pushUndoRedo, undo, getUndoItems, getRedoItems, redo };
}
