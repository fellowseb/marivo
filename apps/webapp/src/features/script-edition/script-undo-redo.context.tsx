import { createContext, useContext, type PropsWithChildren } from 'react';
import { useUndoRedo, type UndoRedoContext } from '../undo-redo/use-undo-redo';
import type { ScriptAction } from './script.context';

export const ScriptUndoRedoContext =
  createContext<UndoRedoContext<ScriptAction> | null>(null);

export function ScriptUndoRedoContextProvider(props: PropsWithChildren) {
  const value = useUndoRedo<ScriptAction>();
  return (
    <ScriptUndoRedoContext.Provider value={value}>
      {props.children}
    </ScriptUndoRedoContext.Provider>
  );
}

export function useScriptUndoRedo() {
  const context = useContext(ScriptUndoRedoContext);
  if (!context) {
    throw new Error('No script undo redo context');
  }
  return context;
}
