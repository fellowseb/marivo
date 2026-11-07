import { useTranslation } from "react-i18next";
import Panel from "../../components/panel.component";
import Button from "../../components/button.component";
import type { ImportSection, ImportSelection, ImportSelectionModel } from "./import-selection.lib";
import styles from "./import-selection-panel.module.css";

interface ImportSelectionPanelProps {
  model: ImportSelectionModel;
  selection: ImportSelection;
  onChange: (selection: ImportSelection) => void;
  keptCount: number;
  totalCount: number;
  /** Lines currently selected in the script view. */
  selectedLineIds: Set<string>;
  onClose?: () => void;
}

function toggle(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

function scrollToLine(lineId: string) {
  const elem = document.getElementById(`script-line-${lineId}`);
  if (!elem) {
    return;
  }
  window.scrollBy({ top: elem.offsetTop - window.pageYOffset, left: 0, behavior: "instant" });
}

function PartRow(props: {
  part: ImportSection;
  excluded: boolean;
  onToggle: (id: string) => void;
  isLast: boolean;
}) {
  // same tree-drawing trick as the Navigate panel
  let treeStruct = props.part.headingLevel === 0 ? "" : props.isLast ? "└" : "├";
  if (props.part.headingLevel !== 0) {
    treeStruct = treeStruct.concat(...new Array(props.part.headingLevel).fill("─"));
    treeStruct += " ";
  }
  return (
    <li className={styles.partRow}>
      <label className={styles.row}>
        <input
          type="checkbox"
          checked={!props.excluded}
          onChange={() => props.onToggle(props.part.id)}
        />
        <Button variant="discrete" onClick={() => scrollToLine(props.part.id)}>
          {treeStruct}
          {props.part.title}
        </Button>
        <span className={styles.count}>{props.part.lineIds.length}</span>
      </label>
    </li>
  );
}

/** "Import selection" panel: Included (Parts as a hierarchy + Characters) and Excluded (lines). */
export function ImportSelectionPanel(props: ImportSelectionPanelProps) {
  const { t } = useTranslation("script");
  const { model, selection, onChange } = props;
  const toggleSection = (id: string) =>
    onChange({ ...selection, excludedSections: toggle(selection.excludedSections, id) });
  const toggleCharacter = (id: string) =>
    onChange({ ...selection, excludedCharacters: toggle(selection.excludedCharacters, id) });
  const includeLines = (ids: string[]) =>
    onChange({
      ...selection,
      excludedLines: new Set([...selection.excludedLines].filter((id) => !ids.includes(id))),
    });
  const excludeLines = (ids: string[]) =>
    onChange({
      ...selection,
      excludedLines: new Set([...selection.excludedLines, ...ids]),
    });

  const excludedLineIds = [...selection.excludedLines];
  const selected = [...props.selectedLineIds];
  const allSelectedExcluded =
    selected.length > 0 && selected.every((id) => selection.excludedLines.has(id));

  return (
    <Panel title={t("panels.importSelection")} icon="filter" onClose={props.onClose}>
      <div className={styles.summary}>
        {props.keptCount} / {props.totalCount} lines selected
      </div>
      {selected.length > 0 ? (
        <div className={styles.selectedActions}>
          {allSelectedExcluded ? (
            <Button icon="next" onClick={() => includeLines(selected)}>
              {t("importSelection.include")}
            </Button>
          ) : (
            <Button icon="delete" onClick={() => excludeLines(selected)}>
              {t("importSelection.exclude")}
            </Button>
          )}
        </div>
      ) : null}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{t("importSelection.included")}</div>
        <div className={styles.groupLabel}>Parts</div>
        <ul className={styles.list}>
          {model.sections.map((part, idx, arr) => (
            <PartRow
              key={part.id}
              part={part}
              excluded={selection.excludedSections.has(part.id)}
              onToggle={toggleSection}
              isLast={idx === arr.length - 1}
            />
          ))}
        </ul>
        {model.characters.length > 0 ? (
          <>
            <div className={styles.groupLabel}>Characters</div>
            <ul className={styles.list}>
              {model.characters.map((character) => (
                <li key={character.id}>
                  <label className={styles.row}>
                    <input
                      type="checkbox"
                      checked={!selection.excludedCharacters.has(character.id)}
                      onChange={() => toggleCharacter(character.id)}
                    />
                    <span className={styles.partTitle}>{character.name}</span>
                    <span className={styles.count}>{character.lineIds.length}</span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          {t("importSelection.excluded", { n: excludedLineIds.length })}
        </div>
        <ul className={styles.excludedList}>
          {excludedLineIds.map((lineId) => (
            <li key={lineId} className={styles.excludedItem}>
              <Button variant="discrete" onClick={() => scrollToLine(lineId)}>
                {model.lineTitles.get(lineId) ?? lineId}
              </Button>
              <Button icon="close" variant="discrete" onClick={() => includeLines([lineId])} />
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}
