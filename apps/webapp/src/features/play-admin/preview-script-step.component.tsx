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
  const previewScriptContext = useScriptContext();
  const [selection, setSelection] = useState<ImportSelection>(EMPTY_SELECTION);
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set());
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
        title={`${props.sourceLabel} ▶  Preview script`}
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
        You can review the import result to make sure there isn't a massive issue before creating
        the project.
        <br /> (i.e. entire sections missing or in wrong order). You'll be able to modify the script
        later.
        <Script
          isEditable={false}
          scriptContext={previewScriptContext}
          excludedLineIds={new Set(allLineIds.filter((id) => !keptLineIds.includes(id)))}
          onSelectedLinesChange={setSelectedLineIds}
        />
      </FlowStep>
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
              sourceLabel={props.sourceLabel ?? "Create from an external source"}
              onBack={props.onBack}
              onReviewDone={props.onReviewDone}
            />
          </ScriptTabToolbarContextProvider>
        </ScriptContextProvider>
      </Suspense>
    </ErrorBoundary>
  );
}
