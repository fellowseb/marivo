import {
  useRef,
  useState,
  type KeyboardEventHandler,
  type PropsWithChildren,
} from 'react';
import type { Line } from './script.models';
import { handleDirections } from './script.utils';
import classNames from 'classnames';
import styles from './script-line.module.css';
import type { ScriptContext } from '../features/script-edition/script.context';
import Button from './button.components';

interface ScriptLineProps {
  lines: ScriptContext['lines'];
  line: Line;
  num: number;
  isEditable: boolean;
  hideLinesOf?: string[];
}

function ScriptLine(props: ScriptLineProps) {
  const { isEditable, line } = props;
  const lineEditableContentRef = useRef<HTMLDivElement>(null);
  const [editedContent, setEditedContent] = useState<string | null>(
    line.version === 0 ? line.text : null,
  );
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
  const hasVersions = (props.line.previousVersionsIds ?? []).length > 0;
  const isEdited = editedContent !== null;
  const [prefixDirection, textWithoutPrefix] =
    isEditing || isEdited || showVersions
      ? ['', editedContent === null ? props.line.text : editedContent]
      : handleDirections(props.line.text);
  const markup = { __html: textWithoutPrefix };
  const isHeading = line.type === 'heading';
  const handleLineClick = () => {
    lineEditableContentRef.current?.focus();
  };
  return (
    <div className={styles.replique} onClick={handleLineClick}>
      <div className={styles.repliqueHandle}>
        {line.type === 'chartext' ? (
          <div className={styles.repliqueNum}>{props.num}</div>
        ) : null}
      </div>
      {line.type === 'chartext' && line.characters.length ? (
        <div className={styles.repliqueCharacter}>
          {line.characters.join(', ')}
          {prefixDirection ? ` ${prefixDirection}` : null}
        </div>
      ) : null}
      {isEditable ? (
        <div className={styles.repliqueActions}>
          <Button icon="save" disabled={!isEdited} />
          <Button icon="delete" />
        </div>
      ) : null}
      <div className={styles.repliqueText}>
        {showVersions ? (
          <div className={styles.repliqueVersion}>
            current - v{props.line.version ?? 1}
          </div>
        ) : null}
        <div
          className={classNames({
            [styles.repliqueText]: true,
            [styles.partName]: isHeading,
            [styles.partNameDepth0]: isHeading && line.headingLevel === 0,
            [styles.partNameDepth1]: isHeading && line.headingLevel === 1,
            [styles.partNameDepth2]: isHeading && line.headingLevel === 2,
            [styles.partNameDepth3]: isHeading && line.headingLevel === 3,
            [styles.partNameDepth4]: isHeading && line.headingLevel === 4,
            [styles.partNameDepth5]: isHeading && line.headingLevel === 5,
          })}
          spellCheck={true}
          contentEditable={isEditable ? 'plaintext-only' : false}
          onFocus={handleLineFocus}
          onBlur={handleLineBlur}
          onKeyUp={handleKeyUp}
          ref={lineEditableContentRef}
          dangerouslySetInnerHTML={markup}
        ></div>
        {props.hideLinesOf ? <div className={styles.blurOverlay}></div> : null}
      </div>
      {isEdited && line.version !== 0 ? (
        <div className={styles.repliqueText}>
          {showVersions ? (
            <div className={styles.repliqueVersion}>
              current - v{props.line.version}
            </div>
          ) : isEdited ? (
            <div className={styles.repliqueVersion}>current</div>
          ) : null}
          <div
            className={classNames({
              [styles.partName]: isHeading,
              [styles.partNameDepth0]: isHeading && line.headingLevel === 0,
              [styles.partNameDepth1]: isHeading && line.headingLevel === 1,
              [styles.partNameDepth2]: isHeading && line.headingLevel === 2,
              [styles.partNameDepth3]: isHeading && line.headingLevel === 3,
              [styles.partNameDepth4]: isHeading && line.headingLevel === 4,
              [styles.partNameDepth5]: isHeading && line.headingLevel === 5,
            })}
          >
            {props.line.text}
          </div>
        </div>
      ) : null}
      {showVersions && hasVersions
        ? (props.line.previousVersionsIds ?? []).map((id) => {
            const prevVersionLineData = props.lines.get(id);
            if (!prevVersionLineData) return null;
            return (
              <div className={styles.repliqueText}>
                <div className={styles.repliqueVersion}>
                  v{prevVersionLineData.version}
                </div>
                <div>{prevVersionLineData.text}</div>
              </div>
            );
          })
        : null}
    </div>
  );
}

interface ScriptLineToBeProps {
  context: ScriptContext;
  pos: number;
}

export function ScriptLineToBe(props: PropsWithChildren<ScriptLineToBeProps>) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const handleKeyUp: KeyboardEventHandler = (event) => {
    if (event.key === '#') {
      props.context.insertHeading(props.pos);
    }
  };
  return (
    <button
      ref={buttonRef}
      onKeyUp={handleKeyUp}
      className={styles.lineToBe}
    ></button>
  );
}

export default ScriptLine;
