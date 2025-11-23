import Toolbar from '../../components/toolbar.component';
import { useScriptUndoRedo } from './script-undo-redo.context';

export function ScriptToolbar() {
  const { undo, getUndoItems, redo, getRedoItems } = useScriptUndoRedo();
  const handleUndo = () => undo(1);
  const undoDisabled = getUndoItems().length === 0;
  const handleRedo = () => redo(1);
  const redoDisabled = getRedoItems().length === 0;
  return (
    <Toolbar
      definition={{
        items: [
          {
            id: 'undo',
            label: 'undo',
            icon: 'undo',
            disabled: undoDisabled,
            onAction: handleUndo,
          },
          {
            id: 'redo',
            label: 'redo',
            icon: 'redo',
            disabled: redoDisabled,
            onAction: handleRedo,
          },
          {
            id: 'search',
            label: 'search',
            icon: 'search',
            disabled: true,
            onAction: () => {},
          },
        ],
      }}
    />
  );
}
