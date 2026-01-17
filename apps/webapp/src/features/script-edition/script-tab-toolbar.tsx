import Toolbar from '../../components/toolbar.component';
import { useScriptTabToolbarContext } from './script-tab-toolbar.context';
import { useScriptUndoRedo } from '../script/script-undo-redo.context';

export function ScriptToolbar() {
  const { setShowSearchPanel } = useScriptTabToolbarContext();
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
            id: 'script-undo',
            label: 'undo',
            icon: 'undo',
            disabled: undoDisabled,
            onAction: handleUndo,
          },
          {
            id: 'script-redo',
            label: 'redo',
            icon: 'redo',
            disabled: redoDisabled,
            onAction: handleRedo,
          },
          {
            id: 'script-search',
            label: 'search',
            icon: 'search',
            disabled: false,
            onAction: () => {
              setShowSearchPanel((prev) => !prev);
            },
          },
        ],
      }}
    />
  );
}
