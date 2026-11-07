import { useTranslation } from "react-i18next";
import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import ErrorBoundary from "../../components/error-boundary.component";
import PageNotFound from "../../components/page-not-found.component";
import DotsLoader from "../../components/dots-loader.component";
import FlowStep from "../../components/flow-step.component";
import Button from "../../components/button.component";
import Script from "../script/script.component";
import { ScriptContextProvider, useScriptContext } from "../script/script.context";
import {
  ScriptTabToolbarContextProvider,
  useScriptTabToolbarContext,
} from "../script-edition/script-tab-toolbar.context";
import ScriptSearchPanel from "../script-edition/script-search-panel.component";
import ScriptNavigatePanel from "../script-edition/script-navigate-panel.component";
import ScriptCharactersPanel from "../script-edition/script-characters-panel.component";
import { ImportSelectionPanel } from "./import-selection-panel.component";
import MenuDropdown from "../../components/menu-dropdown.component";
import {
  computeImportSelectionModel,
  computeKeptLineIds,
  EMPTY_SELECTION,
  type ImportSelection,
} from "./import-selection.lib";
import styles from "./import-script.module.css";

export type PreviewScriptFrom = "import" | "collection";

interface PreviewScriptStepProps {
  scriptUri: string;
  from: PreviewScriptFrom;
  toolbar?: ReactNode;
  /** First breadcrumb segment of the flow, e.g. "Create from an external source". */
  sourceLabel?: string;
  /** Called with the line ids to keep (undefined = keep everything). */
  onReviewDone: (lineIdsToKeep?: string[]) => void;
  onBack: () => void;
}

function PreviewStepInner(props: {
  sourceLabel: string;
  onReviewDone: (lineIdsToKeep?: string[]) => void;
  onBack: () => void;
}) {
  const { t } = useTranslation("script");
  const previewScriptContext = useScriptContext();
  const [selection, setSelection] = useState<ImportSelection>(EMPTY_SELECTION);
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set());
  const [lineIdForMenu, setLineIdForMenu] = useState<string | null>(null);
  const handleShowLineMenu = (id: string) => {
    setLineIdForMenu((prev) => (prev === id ? null : id));
  };
  // the menu acts on the clicked line, or on the whole current selection if
  // the clicked line is part of it
  const applyExclude = (exclude: boolean) => {
    const targets =
      lineIdForMenu && selectedLineIds.has(lineIdForMenu)
        ? [...selectedLineIds]
        : lineIdForMenu
          ? [lineIdForMenu]
          : [];
    if (targets.length === 0) {
      return;
    }
    setSelection((prev) => ({
      ...prev,
      excludedLines: new Set(
        exclude
          ? [...prev.excludedLines, ...targets]
          : [...prev.excludedLines].filter((id) => !targets.includes(id)),
      ),
    }));
    setLineIdForMenu(null);
  };
  const selectionModel = useMemo(
    () => (previewScriptContext ? computeImportSelectionModel(previewScriptContext) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      previewScriptContext?.lines,
      previewScriptContext?.lineContents,
      previewScriptContext?.lineToContents,
      previewScriptContext?.linesOrder,
      previewScriptContext?.characters,
    ],
  );
  const allLineIds = previewScriptContext?.linesOrder ?? [];
  const keptLineIds = selectionModel
    ? computeKeptLineIds(selectionModel, selection, allLineIds)
    : allLineIds;
  const menuLineExcluded = lineIdForMenu ? !keptLineIds.includes(lineIdForMenu) : false;
  const handleReviewDone = () => {
    // undefined = keep everything (server default)
    props.onReviewDone(keptLineIds.length === allLineIds.length ? undefined : keptLineIds);
  };
  const {
    showSearchPanel,
    showNavigatePanel,
    showCharactersPanel,
    showImportSelectionPanel,
    setShowSearchPanel,
    setShowNavigatePanel,
    setShowCharactersPanel,
    setShowImportSelectionPanel,
  } = useScriptTabToolbarContext();
  // the import-selection panel is open by default (unlike the other panels)
  useEffect(() => {
    setShowImportSelectionPanel(true);
  }, [setShowImportSelectionPanel]);
  const showPanels =
    showSearchPanel || showNavigatePanel || showCharactersPanel || showImportSelectionPanel;
  const handleCloseSearchPanel = () => {
    setShowSearchPanel(false);
  };
  const handleCloseNavigatePanel = () => {
    setShowNavigatePanel(false);
  };
  const handleCloseCharactersPanel = () => {
    setShowCharactersPanel(false);
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
      }}
    >
      <FlowStep
        title={t("preview.title", { source: props.sourceLabel })}
        Actions={
          <>
            <Button icon="previous" onClick={props.onBack} />
            <Button rightIcon="next" onClick={handleReviewDone}>
              Done
            </Button>
          </>
        }
        growVertically={true}
      >
        {t("preview.intro")}
        <br />
        {t("preview.introDetail")}
        <Script
          isEditable={false}
          scriptContext={previewScriptContext}
          excludedLineIds={new Set(allLineIds.filter((id) => !keptLineIds.includes(id)))}
          onSelectedLinesChange={setSelectedLineIds}
          onLineMenuClicked={handleShowLineMenu}
        />
      </FlowStep>
      {lineIdForMenu ? (
        <MenuDropdown
          positionAnchorName={`--menu-anchor-${lineIdForMenu}`}
          onBlur={() => setLineIdForMenu(null)}
        >
          {menuLineExcluded ? (
            <Button icon="next" onClick={() => applyExclude(false)}>
              {t("importSelection.include")}
            </Button>
          ) : (
            <Button icon="delete" onClick={() => applyExclude(true)}>
              {t("importSelection.exclude")}
            </Button>
          )}
        </MenuDropdown>
      ) : null}
      {showPanels ? (
        <div className={styles.panelsContainer}>
          {showImportSelectionPanel && selectionModel ? (
            <ImportSelectionPanel
              model={selectionModel}
              selection={selection}
              onChange={setSelection}
              keptCount={keptLineIds.length}
              totalCount={allLineIds.length}
              selectedLineIds={selectedLineIds}
              onClose={() => setShowImportSelectionPanel(false)}
            />
          ) : null}
          {showSearchPanel ? <ScriptSearchPanel onClose={handleCloseSearchPanel} /> : null}
          {showNavigatePanel ? (
            <ScriptNavigatePanel
              onClose={handleCloseNavigatePanel}
              outline={previewScriptContext?.outline ?? []}
            />
          ) : null}
          {showCharactersPanel ? (
            <ScriptCharactersPanel
              onClose={handleCloseCharactersPanel}
              characters={previewScriptContext?.characters ?? {}}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Shared "preview the script" step, used by both the import flow
 * (from="import") and the collection flow (from="collection").
 */
export function PreviewScriptStep(props: PreviewScriptStepProps) {
  const { t } = useTranslation("script");
  return (
    <ErrorBoundary fallback={<PageNotFound />}>
      <Suspense
        fallback={
          <div
            style={{
              flex: "1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <DotsLoader size="xlarge" />
          </div>
        }
      >
        <ScriptContextProvider uri={props.scriptUri} from={props.from}>
          <ScriptTabToolbarContextProvider>
            {props.toolbar}
            <PreviewStepInner
              sourceLabel={props.sourceLabel ?? t("newPlay:nameStep.defaultSource")}
              onBack={props.onBack}
              onReviewDone={props.onReviewDone}
            />
          </ScriptTabToolbarContextProvider>
        </ScriptContextProvider>
      </Suspense>
    </ErrorBoundary>
  );
}
