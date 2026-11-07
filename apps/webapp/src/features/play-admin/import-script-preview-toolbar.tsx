import { useTranslation } from "react-i18next";
import Toolbar from "../../components/toolbar.component";
import { useScriptTabToolbarContext } from "../script-edition/script-tab-toolbar.context.tsx";

export function ImportScriptPreviewToolbar() {
  const { t } = useTranslation("script");
  const {
    setShowNavigatePanel,
    setShowSearchPanel,
    setShowCharactersPanel,
    setShowImportSelectionPanel,
  } = useScriptTabToolbarContext();

  return (
    <Toolbar
      definition={{
        items: [
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
          {
            id: "import-selection",
            label: t("toolbar.importSelection"),
            icon: "filter",
            disabled: false,
            onAction: () => {
              setShowImportSelectionPanel((prev) => !prev);
            },
          },
        ],
      }}
    />
  );
}
