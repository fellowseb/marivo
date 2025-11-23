import 'keyboard-css/dist/css/main.min.css';
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEventHandler,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type PropsWithChildren,
} from 'react';
import classNames from 'classnames';
import type { Line, LineContent } from './script.models';
import { handleDirections } from './script.utils';
import styles from './script-line.module.css';
import Button from './button.components';
import type { LineContentInfo } from '../features/script-edition/script.context';

interface ScriptLineProps {
  lineContentInfo: LineContentInfo;
  line: Line;
  num: number;
  isEditable: boolean;
  hideLinesOf?: string[];
  newlyInserted: boolean;
  onShowMenu: (id: string) => void;
  onSelect: (id: string, add: boolean) => void;
  onDraftTextEdit: (contentId: string, text: string) => void;
  onDraftInit: (content: LineContent, text?: string, deleted?: boolean) => void;
  selected: boolean;
  characters: { [id: string]: string };
}

function ScriptLine(props: ScriptLineProps) {
  const timeoutIdRef = useRef<number>(null);
  const { characters, isEditable, line } = props;
  const newlyInserted = useRef(props.newlyInserted);
  const lineEditableContentRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [offset, setOffset] = useState<number | undefined>();

  useLayoutEffect(() => {
    if (!isEditing) {
      setOffset(undefined);
      return;
    }
    const curr = lineEditableContentRef.current;
    if (offset !== undefined && curr) {
      setOffset(undefined);
      const newRange = document.createRange();
      if (curr.childNodes.length) {
        newRange.setStart(curr.childNodes[0], offset);
        const selection = document.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    }
  });

  const handleLineFocus = () => {
    if (isEditable) {
      setIsEditing(true);
    }
  };
  const handleKeyUp: FormEventHandler = () => {
    if (!isEditable) {
      return;
    }
    const { current } = lineEditableContentRef;
    if (!current) {
      return;
    }
    // const { key } = event;
    // if (key === 'Escape') {
    //   current.blur();
    //   return true;
    // }
    // if (key === 'Tab') {
    //   return;
    // }
    // if (key.length === 1 || key === 'Delete' || key === 'Backspace') {
    const range = document.getSelection()?.getRangeAt(0);
    if (range) {
      setOffset(range.startOffset);
    }
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    timeoutIdRef.current = window.setTimeout(() => {
      if (lineContent.type === 'draft') {
        props.onDraftTextEdit(lineContent.id, current.textContent);
      } else {
        props.onDraftInit(lineContent, current.textContent);
      }
      timeoutIdRef.current = null;
    }, 3000);
    // }
  };

  const handleDelete = () => {
    if (lineContent.type === 'draft') {
      // props.onDraftTextEdit(lineContent.id, undefined, true);
    } else {
      props.onDraftInit(lineContent, undefined, true);
    }
  };
  const handleLineBlur = () => {
    const { current } = lineEditableContentRef;
    if (current) {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        if (lineContent.type === 'draft') {
          props.onDraftTextEdit(lineContent.id, current.textContent);
        } else {
          props.onDraftInit(lineContent, current.textContent);
        }
        timeoutIdRef.current = null;
      }
    }
    setIsEditing(false);
  };
  const {
    content: lineContent,
    hasPreviousVersions,
    hasSharedDraft,
    hasDraft,
    isNewUnsaved,
  } = props.lineContentInfo;
  const isEdited =
    lineEditableContentRef.current &&
    lineContent.text !==
      (lineEditableContentRef.current?.childNodes ?? [])[0]?.nodeValue;
  const [prefixDirection, textWithoutPrefix] =
    isEditing || props.line.type !== 'chartext'
      ? ['', lineContent.text]
      : handleDirections(lineContent.text);
  const dangerouslySetInnerHTML = useMemo(
    () => ({ __html: textWithoutPrefix }),
    [textWithoutPrefix],
  );
  const isHeading = lineContent.lineType === 'heading';
  const focusOnNewMount = useEffectEvent(() => {
    if (newlyInserted.current) {
      lineEditableContentRef.current?.focus();
    }
  });
  useEffect(() => {
    focusOnNewMount();
  }, []);
  // useLayoutEffect(() => {
  //   if (isEditing) {
  //     const selection = window.getSelection();
  //     if (selection) {
  //       const textNode = (lineEditableContentRef.current?.childNodes ?? [])[0];
  //       if (textNode) {
  //         // if (newlyInserted.current) {
  //         //   const range = new Range();
  //         //   range.selectNode(textNode);
  //         //   selection.removeAllRanges();
  //         //   selection.addRange(range);
  //         //   newlyInserted.current = false;
  //         // } else {
  //         selection.setPosition(textNode, textNode.nodeValue?.length);
  //         // }
  //       }
  //     }
  //   }
  // }, [isEditing]);
  // const handleClick = () => {
  //   lineEditableContentRef.current?.focus();
  // };
  const handleHandleClick: MouseEventHandler = (event) => {
    props.onSelect(props.line.id, event.ctrlKey);
    event.stopPropagation();
    event.preventDefault();
  };
  const [showMenu, setShowMenu] = useState(false);
  const handleMenuClick = () => {
    // setShowMenu((prev) => !prev);
    props.onShowMenu(props.line.id);
  };
  const handleMenuBlur = () => {
    setShowMenu(false);
  };
  if (!hasDraft && lineContent.deleted) {
    return null;
  }
  return (
    <>
      <div
        className={classNames({
          [styles.replique]: true,
          [styles.selected]: props.selected,
        })}
        //onClick={handleClick}
      >
        <div
          className={classNames({
            [styles.repliqueHandle]: true,
          })}
          onClick={handleHandleClick}
        >
          {line.type === 'chartext' ? (
            <div className={styles.repliqueNum}>{props.num}</div>
          ) : null}
        </div>
        {lineContent.lineType === 'chartext' &&
        lineContent.characters.length ? (
          <div
            className={classNames({
              [styles.repliqueCharacter]: true,
              [styles.repliqueDeleted]: lineContent.deleted,
            })}
          >
            {lineContent.characters.map((i) => characters[i]).join(', ')}
            {prefixDirection ? ` ${prefixDirection}` : null}
          </div>
        ) : null}
        <div>
          <div
            className={classNames({
              [styles.repliqueText]: true,
              [styles.repliqueDeleted]: lineContent.deleted,
              [styles.freetextLine]: line.type === 'freetext',
              [styles.partName]: isHeading,
              [styles.partNameDepth0]:
                isHeading && lineContent.headingLevel === 0,
              [styles.partNameDepth1]:
                isHeading && lineContent.headingLevel === 1,
              [styles.partNameDepth2]:
                isHeading && lineContent.headingLevel === 2,
              [styles.partNameDepth3]:
                isHeading && lineContent.headingLevel === 3,
              [styles.partNameDepth4]:
                isHeading && lineContent.headingLevel === 4,
              [styles.partNameDepth5]:
                isHeading && lineContent.headingLevel === 5,
            })}
            spellCheck={true}
            contentEditable={isEditable ? 'plaintext-only' : false}
            onFocus={handleLineFocus}
            onBlur={handleLineBlur}
            onInput={handleKeyUp}
            ref={lineEditableContentRef}
            dangerouslySetInnerHTML={dangerouslySetInnerHTML}
            suppressContentEditableWarning={true}
          ></div>
          <div
            className={classNames({
              [styles.menuHandle]: true,
            })}
            onClick={handleMenuClick}
            style={{
              anchorName: '--menu-anchor-' + line.id,
            }}
          >
            {hasSharedDraft ? (
              <div className={styles.sharedDraftsIndicator} />
            ) : null}
            {hasDraft ? <div className={styles.unsavedDraftIndicator} /> : null}
            {hasPreviousVersions ? (
              <div className={styles.previousVersionsIndicator} />
            ) : null}
          </div>
          {props.hideLinesOf ? (
            <div className={styles.blurOverlay}></div>
          ) : null}
        </div>
      </div>
      <dialog
        className={classNames({
          [styles.menu]: true,
          [styles.hidden]: !showMenu,
        })}
        style={{
          positionAnchor: '--menu-anchor-' + line.id,
        }}
        open={showMenu}
        onBlur={handleMenuBlur}
      >
        {hasDraft && lineContent.deleted ? null : (
          <Button icon="delete" onClick={handleDelete}>
            Remove line
          </Button>
        )}
        {hasDraft ? (
          isNewUnsaved ? (
            <Button icon="save">Save</Button>
          ) : (
            <>
              <Button icon="save">Save changes</Button>
              <Button icon="save">Save as new version</Button>
              <Button icon="save">Save as shared draft</Button>
              <Button icon="clear">Discard changes</Button>
            </>
          )
        ) : null}
        {hasPreviousVersions ? (
          <Button icon="versions">Show previous versions</Button>
        ) : null}
        {hasSharedDraft ? (
          <Button icon="user">Show shared drafts</Button>
        ) : null}
      </dialog>
    </>
  );
}

interface ScriptLineToBeProps {
  characters: { [id: string]: string };
  insertHeading: (pos: number, level: number) => string;
  insertFreetextLine: (pos: number, c: string) => string;
  insertCueLine: (pos: number, charId: string) => string;
  pos: number;
  onLineInserted: (id: string) => void;
}

function sortByCharacterName(lhs: [string, string], rhs: [string, string]) {
  return lhs[1].localeCompare(rhs[1]);
}

export function ScriptLineToBe(props: PropsWithChildren<ScriptLineToBeProps>) {
  const elemRef = useRef<HTMLDivElement>(null);
  const sortedChars = Object.entries(props.characters).sort(
    sortByCharacterName,
  );
  const handleKeyUp: KeyboardEventHandler = ({ key }) => {
    if (key.length == 1 && /[0-9]/.test(key)) {
      const digit = parseInt(key, 10);
      if (Number.isInteger(digit) && showHeadingMenu) {
        const lineId = props.insertHeading(props.pos, digit);
        props.onLineInserted(lineId);
        return true;
      } else if (Number.isInteger(digit) && showCharactersMenu) {
        const lineId = props.insertCueLine(
          props.pos,
          sortedChars[digit - 1][0],
        );
        props.onLineInserted(lineId);
        return true;
      }
    } else if (key === '#') {
      setShowHeadingMenu((prev) => !prev);
      setShowCharactersMenu(false);
      return true;
    } else if (key === '@') {
      setShowCharactersMenu((prev) => !prev);
      setShowHeadingMenu(false);
      return true;
    } else if (
      key.length == 1 ||
      (key.length > 1 && /[^a-zA-Z0-9]/.test(key))
    ) {
      const lineId = props.insertFreetextLine(props.pos, key);
      props.onLineInserted(lineId);
      return true;
    } else if (key === 'Escape') {
      if (showHeadingMenu) {
        setShowHeadingMenu(false);
      } else if (showCharactersMenu) {
        setShowCharactersMenu(false);
      } else {
        elemRef.current?.blur();
      }
      return true;
    }
  };
  const handleBlur = () => {
    setShowHeadingMenu(false);
    setShowCharactersMenu(false);
  };
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showCharactersMenu, setShowCharactersMenu] = useState(false);
  return (
    <div
      className={styles.lineToBeContainer}
      tabIndex={0}
      onKeyUp={handleKeyUp}
      onBlur={handleBlur}
      ref={elemRef}
    >
      <span className={styles.instructions}>
        Start typing to insert a new{' '}
        <kbd className="kbc-button no-container">#</kbd> heading,{' '}
        <kbd className="kbc-button no-container">@</kbd> cue line or free text
      </span>
      <div
        className={classNames({
          [styles.headingsMenu]: true,
          [styles.hidden]: !showHeadingMenu,
        })}
      >
        <div>
          <kbd className="kbc-button no-container">0</kbd>
          <div className={classNames([styles.partName, styles.partNameDepth0])}>
            Title
          </div>
        </div>
        <div>
          <kbd className="kbc-button no-container">1</kbd>
          <div className={classNames([styles.partName, styles.partNameDepth1])}>
            Acte / Heading level 1
          </div>
        </div>
        <div>
          <kbd className="kbc-button no-container">2</kbd>
          <div className={classNames([styles.partName, styles.partNameDepth2])}>
            Scène / Heading level 2
          </div>
        </div>
        <div>
          <kbd className="kbc-button no-container">3</kbd>
          <div className={classNames([styles.partName, styles.partNameDepth3])}>
            Heading level 3
          </div>
        </div>
        <div>
          <kbd className="kbc-button no-container">4</kbd>
          <div className={classNames([styles.partName, styles.partNameDepth4])}>
            Heading level 4
          </div>
        </div>
      </div>
      <div
        className={classNames({
          [styles.headingsMenu]: true,
          [styles.hidden]: !showCharactersMenu,
        })}
      >
        {sortedChars.map(([id, name], idx) => {
          return (
            <div key={id}>
              <kbd className="kbc-button no-container">{idx + 1}</kbd>
              <div>{name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ScriptLine;
