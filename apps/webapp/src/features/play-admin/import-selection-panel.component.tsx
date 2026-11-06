import { useState } from "react";
import type { ImportSection, ImportSelection, ImportSelectionModel } from "./import-selection.lib";
import styles from "./import-selection-panel.module.css";

interface ImportSelectionPanelProps {
  model: ImportSelectionModel;
  selection: ImportSelection;
  onChange: (selection: ImportSelection) => void;
  keptCount: number;
  totalCount: number;
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

function SectionRow(props: {
  section: ImportSection;
  selection: ImportSelection;
  onToggleSection: (id: string) => void;
  onToggleLine: (id: string) => void;
  lineTitles: Map<string, string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const checked = !props.selection.excludedSections.has(props.section.id);
  return (
    <li className={styles.sectionItem}>
      <label className={styles.row}>
        <input
          type="checkbox"
          checked={checked}
          onChange={() => props.onToggleSection(props.section.id)}
        />
        <button
          type="button"
          className={styles.sectionToggle}
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? "Collapse section" : "Expand section"}
        >
          {expanded ? "▼" : "▶"}
        </button>
        <span className={styles.sectionTitle}>
          {"  ".repeat(props.section.headingLevel - 1)}
          {props.section.title}
        </span>
        <span className={styles.count}>{props.section.lineIds.length} lines</span>
      </label>
      {expanded ? (
        <ul className={styles.lineList}>
          {props.section.lineIds.map((lineId) => (
            <li key={lineId}>
              <label className={styles.row}>
                <input
                  type="checkbox"
                  checked={!props.selection.excludedLines.has(lineId)}
                  onChange={() => props.onToggleLine(lineId)}
                />
                <span className={styles.lineTitle}>{props.lineTitles.get(lineId) ?? lineId}</span>
              </label>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** Panel to select which parts of the previewed play to import. */
export function ImportSelectionPanel(props: ImportSelectionPanelProps) {
  const { model, selection, onChange } = props;
  const lineTitles = model.lineTitles;
  const toggleSection = (id: string) =>
    onChange({ ...selection, excludedSections: toggle(selection.excludedSections, id) });
  const toggleCharacter = (id: string) =>
    onChange({ ...selection, excludedCharacters: toggle(selection.excludedCharacters, id) });
  const toggleLine = (id: string) =>
    onChange({ ...selection, excludedLines: toggle(selection.excludedLines, id) });

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <strong>Select what to import</strong>
        <span className={styles.count}>
          {props.keptCount} / {props.totalCount} lines
        </span>
      </div>
      <div className={styles.body}>
        <h4 className={styles.groupTitle}>Sections</h4>
        <ul className={styles.list}>
          {model.sections.map((section) => (
            <SectionRow
              key={section.id}
              section={section}
              selection={selection}
              onToggleSection={toggleSection}
              onToggleLine={toggleLine}
              lineTitles={lineTitles}
            />
          ))}
        </ul>
        {model.characters.length > 0 ? (
          <>
            <h4 className={styles.groupTitle}>Characters</h4>
            <ul className={styles.list}>
              {model.characters.map((character) => (
                <li key={character.id}>
                  <label className={styles.row}>
                    <input
                      type="checkbox"
                      checked={!selection.excludedCharacters.has(character.id)}
                      onChange={() => toggleCharacter(character.id)}
                    />
                    <span className={styles.sectionTitle}>{character.name}</span>
                    <span className={styles.count}>{character.lineIds.length} lines</span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </div>
  );
}
