import { useRef, useState, type KeyboardEventHandler } from 'react';
import type { Line } from './script.models';
import { handleDirections } from './script.utils';
import classNames from 'classnames';
import styles from './script-line.module.css';

interface ScriptLineProps {
  line: Line;
  num: number;
  isEditable: boolean;
  hideLinesOf?: string[];
}

function ScriptLine(props: ScriptLineProps) {
  const { isEditable } = props;
  const lineEditableContentRef = useRef<HTMLDivElement>(null);
  const [editedContent, setEditedContent] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  const handleShowVersions = () => {
    setShowVersions(!showVersions);
  };
  const handleLineFocus = () => {
    if (isEditable) {
      setIsEditing(true);
    }
  };
  const handleKeyUp: KeyboardEventHandler = (event) => {
    if (!isEditable) {
      return;
    }
    if (event.key === 'Escape') {
      const { current } = lineEditableContentRef;
      if (!current) {
        return;
      }
      current.blur();
    }
  };
  const handleLineBlur = () => {
    if (!isEditable) {
      return;
    }
    const { current } = lineEditableContentRef;
    if (!current) {
      return;
    }
    setEditedContent(
      current.textContent !== props.line.text ? current.textContent : null,
    );
    setIsEditing(false);
  };
  const hasVersions = (props.line.previousVersions ?? []).length > 0;
  const isEdited = editedContent !== null;
  const [prefixDirection, textWithoutPrefix] =
    isEditing || isEdited || showVersions
      ? ['', editedContent === null ? props.line.text : editedContent]
      : handleDirections(props.line.text);
  const markup = { __html: textWithoutPrefix };
  return (
    <div className={styles.replique}>
      <div className={styles.repliqueNum}>{props.num}</div>
      {props.line.character ? (
        <div className={styles.repliqueCharacter}>
          {props.line.character}
          {prefixDirection ? ` ${prefixDirection}` : null}
        </div>
      ) : null}
      {isEditable ? (
        <div className={styles.repliqueActions}>
          <button
            className={classNames({
              [styles.repliqueActionDelete]: true,
              [styles.repliqueAction]: true,
            })}
          ></button>
          <button
            disabled={!hasVersions}
            onClick={handleShowVersions}
            className={classNames({
              [styles.repliqueActionViewVersions]: true,
              [styles.repliqueAction]: true,
              [styles.repliqueActionDisabled]: !hasVersions,
            })}
          ></button>
        </div>
      ) : null}
      <div className={styles.repliqueText}>
        {isEdited ? (
          <div className={styles.repliqueVersion}>unsaved changes</div>
        ) : showVersions ? (
          <div className={styles.repliqueVersion}>
            current - v{props.line.version ?? 1}
          </div>
        ) : null}
        <div
          className={styles.repliqueText}
          spellCheck={true}
          contentEditable={isEditable ? 'plaintext-only' : false}
          onFocus={handleLineFocus}
          onBlur={handleLineBlur}
          onKeyUp={handleKeyUp}
          ref={lineEditableContentRef}
          dangerouslySetInnerHTML={markup}
        ></div>
        {props.line.character &&
        (props.hideLinesOf ?? []).includes(props.line.character) ? (
          <div className={styles.blurOverlay}></div>
        ) : null}
      </div>
      {isEdited ? (
        <div className={styles.repliqueText}>
          {showVersions ? (
            <div className={styles.repliqueVersion}>
              current - v{props.line.version}
            </div>
          ) : isEdited ? (
            <div className={styles.repliqueVersion}>current</div>
          ) : null}
          <div>{props.line.text}</div>
        </div>
      ) : null}
      {showVersions && hasVersions
        ? (props.line.previousVersions ?? []).map(({ version, text }) => (
            <div className={styles.repliqueText}>
              <div className={styles.repliqueVersion}>v{version}</div>
              <div>{text}</div>
            </div>
          ))
        : null}
    </div>
  );
}

export default ScriptLine;
