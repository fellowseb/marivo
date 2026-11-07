import { useTranslation } from "react-i18next";
import Toolbar from "../../components/toolbar.component";
import { useScriptTabToolbarContext } from "./script-tab-toolbar.context";
import { useScriptUndoRedo } from "../script/script-undo-redo.context";

export function ScriptToolbar() {
  const { t } = useTranslation("script");
  const { setShowNavigatePanel, setShowSearchPanel, setShowCharactersPanel } =
    useScriptTabToolbarContext();
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
            id: "script-undo",
            label: t("toolbar.undo"),
            icon: "undo",
            disabled: undoDisabled,
            onAction: handleUndo,
          },
          {
            id: "script-redo",
            label: t("toolbar.redo"),
            icon: "redo",
            disabled: redoDisabled,
            onAction: handleRedo,
          },
          {
            id: "script-search",
            label: t("toolbar.search"),
            icon: "search",
            disabled: false,
            onAction: () => {
              setShowSearchPanel((prev) => !prev);
            },
          },
          {
            id: "script-navigate",
            label: t("toolbar.navigate"),
            icon: "navigate",
            disabled: false,
            onAction: () => {
              setShowNavigatePanel((prev) => !prev);
            },
          },
          {
            id: "script-characters",
            label: t("toolbar.characters"),
            icon: "characterLine",
            disabled: false,
            onAction: () => {
              setShowCharactersPanel((prev) => !prev);
            },
          },
        ],
      }}
    />
  );
}
