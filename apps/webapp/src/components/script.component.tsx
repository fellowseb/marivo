import classNames from 'classnames';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEventHandler,
  type UIEventHandler,
} from 'react';
import { Fragment } from 'react/jsx-runtime';
import Button from './button.component';
import ScriptLine, { ScriptLineToBe } from './script-line.component';
import styles from './script.module.css';
import Skeleton from './skeleton.component';
import { useScriptContext } from '../features/script-edition/script.context';
import type {
  CueLineEditableContent,
  HeadingLineEditableContent,
  LineContent,
  LineEditableContent,
} from './script.models';
import { ScriptChangeHeadingDialog } from './script-change-heading-dialog.component';
import { ScriptChangeCharactersDialog } from './script-change-characters-dialog.component';
import { ScriptLineVersionsDialog } from './script-line-versions-dialog.component';

interface ScriptProps {
  isEditable: boolean;
}

function Script(props: ScriptProps) {
  let lineCount = 0;
  const [insertedLineId, setInsertedLineId] = useState<string | null>(null);
  const [selectedLines, setSelectedLines] = useState(new Set<string>());
  const scriptContext = useScriptContext();
  const handleLineInserted = (id: string) => {
    setInsertedLineId(id);
  };
  const on = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setSelectedLines(new Set());
    }
    if (event.key === 'Delete' && selectedLines.size) {
      // scriptContext.removeLines([...selectedLines]);
    }
  };
  useEffect(() => {
    document.addEventListener('keyup', on);
    return () => {
      document.removeEventListener('keyup', on);
    };
  }, [selectedLines]);
  const handleClick = () => {
    setSelectedLines((prev) => (prev.size ? new Set() : prev));
  };
  const handleInitDraft = (
    content: LineContent,
    text?: string,
    deleted?: boolean,
  ) => {
    scriptContext?.initDraft(content, text, deleted);
  };
  const handleEditLineText = (id: string, text: string) => {
    scriptContext?.editLineText(id, text);
  };
  const handleEdit = (id: string, content: LineEditableContent) => {
    scriptContext?.editLine(id, content);
  };
  const handleSelectLine = (id: string, add: boolean) => {
    const had = selectedLines.has(id);
    setSelectedLines((prev) => {
      const selection = new Set<string>(add ? [...prev] : []);
      if (add) {
        if (had) {
          selection.delete(id);
        } else {
          selection.add(id);
        }
      } else {
        selection.add(id);
      }
      return selection;
    });
  };
  const [lineIdForMenu, setLineIdForMenu] = useState<string | null>(null);
  const [showChangeHeadingDialog, setShowChangeHeadingDialog] = useState(false);
  const [showChangeCharactersDialog, setShowChangeCharactersDialog] =
    useState(false);
  const [showPreviousVersionsDialog, setShowPreviousVersionsDialog] =
    useState(false);
  const [showSharedDraftsDialog, setShowSharedDraftsDialog] = useState(false);
  const menuLine = lineIdForMenu
    ? scriptContext?.lines.get(lineIdForMenu)
    : undefined;
  const [menuLineContent, menuLineInfo] = menuLine
    ? (scriptContext?.getLineContentForDisplayWithInfo(menuLine) ?? [
        null,
        null,
      ])
    : [null, null];
  const handleShowLineMenu = (id: string) => {
    setLineIdForMenu((prev) => {
      if (prev !== id) {
        return id;
      }
      return prev ? null : id;
    });
    setShowChangeHeadingDialog(false);
    setShowChangeCharactersDialog(false);
    setShowSharedDraftsDialog(false);
    setShowPreviousVersionsDialog(false);
  };
  const handleDiscardChanges = () => {
    if (lineIdForMenu) {
      scriptContext?.discardChanges(lineIdForMenu);
      menuDialogRef.current?.focus();
    }
  };
  const handleSaveChanges = () => {
    if (lineIdForMenu) {
      scriptContext?.saveChanges(lineIdForMenu);
      if (menuLineContent?.deleted) {
        setLineIdForMenu(null);
      } else {
        menuDialogRef.current?.focus();
      }
    }
  };
  const handleSaveChangesAsNewVersion = () => {
    if (lineIdForMenu) {
      scriptContext?.saveChangesAsNewVersion(lineIdForMenu);
      if (menuLineContent?.deleted) {
        setLineIdForMenu(null);
      } else {
        menuDialogRef.current?.focus();
      }
    }
  };
  const handleSaveChangesAsSharedDraft = () => {
    if (lineIdForMenu) {
      scriptContext?.saveChangesAsSharedDraft(lineIdForMenu);
      menuDialogRef.current?.focus();
    }
  };
  const handleDeleteLine = () => {
    if (lineIdForMenu) {
      const line = scriptContext?.lines.get(lineIdForMenu);
      if (line) {
        const contentWithInfo =
          scriptContext?.getLineContentForDisplayWithInfo(line);
        if (contentWithInfo) {
          scriptContext?.initDraft(contentWithInfo[0], undefined, true);
          menuDialogRef.current?.focus();
        }
      }
    }
  };
  const handleChangeHeadingLevel = () => {
    setShowChangeHeadingDialog(true);
  };
  const handleChangeCharacters = () => {
    setShowChangeCharactersDialog(true);
  };
  const handleShowSharedDrafts = () => {
    setShowSharedDraftsDialog(true);
  };
  const handleShowPreviousVersions = () => {
    setShowPreviousVersionsDialog(true);
  };
  const handleDialogOK = () => {
    closeDialogs();
  };
  const closeDialogs = () => {
    setShowChangeHeadingDialog(false);
    setShowChangeCharactersDialog(false);
    setShowSharedDraftsDialog(false);
    setShowPreviousVersionsDialog(false);
    setLineIdForMenu(null);
  };
  const handleHeadingLevelChanged = (headingLevel: number) => {
    if (menuLineContent) {
      scriptContext?.editLine(menuLineContent.lineId, {
        deleted: menuLineContent.deleted,
        text: menuLineContent.text ?? '',
        lineType: 'heading',
        headingLevel,
      } satisfies HeadingLineEditableContent);
    }
  };
  const handleCharactersChanged = (characters: string[]) => {
    if (menuLineContent) {
      scriptContext?.editLine(menuLineContent.lineId, {
        characters,
        deleted: menuLineContent.deleted,
        text: menuLineContent.text ?? '',
        lineType: 'chartext',
      } satisfies CueLineEditableContent);
    }
  };
  const handleDialogOutsideClick = () => {
    closeDialogs();
  };
  const menuDialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (lineIdForMenu) {
      menuDialogRef.current?.focus();
    }
  }, [lineIdForMenu]);
  const handleMenuOutsideClick: FocusEventHandler = (event) => {
    if (
      !menuDialogRef.current ||
      !menuDialogRef.current.contains(event.relatedTarget)
    ) {
      setLineIdForMenu(null);
    }
  };
  const handleDeleteSharedDraft = (contentId: string) => {
    if (menuLineContent) {
      scriptContext?.deleteSharedDraft(menuLineContent.lineId, contentId);
    }
  };
  const handleDeletePreviousVersion = (contentId: string) => {
    if (menuLineContent) {
      scriptContext?.deletePreviousVersion(menuLineContent.lineId, contentId);
    }
  };
  const handleApplySharedDraftAsNewVersion = (
    sharedDraftContent: LineContent,
  ) => {
    if (menuLineContent) {
      scriptContext?.applySharedDraftAsNewVersion(
        menuLineContent.lineId,
        sharedDraftContent,
      );
    }
  };
  const handleApplyPreviousVersionAsNewVersion = (
    previousVersion: LineContent,
  ) => {
    if (menuLineContent) {
      scriptContext?.applyPreviousVersionAsNewVersion(
        menuLineContent.lineId,
        previousVersion,
      );
    }
  };
  const showModalDialog =
    menuLine &&
    (showChangeHeadingDialog ||
      showChangeCharactersDialog ||
      showSharedDraftsDialog ||
      showPreviousVersionsDialog);
  return (
    <>
      <div className={styles.scriptContent} onClick={handleClick}>
        {scriptContext ? (
          <>
            {scriptContext.linesOrder.map((lineId, i) => {
              const line = scriptContext.lines.get(lineId);
              if (!line) {
                return null;
              }
              const [content, lineInfo] =
                scriptContext.getLineContentForDisplayWithInfo(line);
              const isDeletedSavedLine =
                content.deleted && content.type === 'saved_version';
              if (line.type === 'chartext' && !isDeletedSavedLine) {
                ++lineCount;
              }
              const selected = selectedLines.has(line.id);
              return false ? null : (
                <Fragment key={line.id}>
                  {props.isEditable ? (
                    <ScriptLineToBe
                      onLineInserted={handleLineInserted}
                      insertCueLine={scriptContext.insertCueLine}
                      insertFreetextLine={scriptContext.insertFreetextLine}
                      insertHeading={scriptContext.insertHeading}
                      characters={scriptContext.characters}
                      pos={i}
                    />
                  ) : null}
                  <ScriptLine
                    selected={selected}
                    onShowMenu={handleShowLineMenu}
                    onSelect={handleSelectLine}
                    onDraftTextEdit={handleEditLineText}
                    onDraftInit={handleInitDraft}
                    onEdit={handleEdit}
                    newlyInserted={insertedLineId === line.id}
                    num={lineCount}
                    line={line}
                    characters={scriptContext.characters}
                    key={line.id}
                    isEditable={props.isEditable}
                    content={content}
                    lineInfo={lineInfo}
                  />
                </Fragment>
              );
            })}
            {props.isEditable ? (
              <ScriptLineToBe
                onLineInserted={handleLineInserted}
                insertCueLine={scriptContext.insertCueLine}
                insertFreetextLine={scriptContext.insertFreetextLine}
                insertHeading={scriptContext.insertHeading}
                characters={scriptContext.characters}
                pos={scriptContext.linesOrder.length}
              />
            ) : null}
            {menuLineContent && !showModalDialog ? (
              <dialog
                ref={menuDialogRef}
                className={classNames({
                  [styles.menu]: true,
                })}
                style={{
                  positionAnchor: '--menu-anchor-' + lineIdForMenu,
                }}
                open={true}
                onBlur={handleMenuOutsideClick}
              >
                {menuLineContent.lineType === 'heading' ? (
                  <Button icon="heading" onClick={handleChangeHeadingLevel}>
                    Change heading level
                  </Button>
                ) : null}
                {menuLineContent.lineType === 'chartext' ? (
                  <Button icon="characterLine" onClick={handleChangeCharacters}>
                    Change characters
                  </Button>
                ) : null}
                {!menuLineContent.deleted ? (
                  <Button icon="delete" onClick={handleDeleteLine}>
                    Remove line
                  </Button>
                ) : null}
                {menuLineInfo.hasDraft ? (
                  menuLineInfo.isNewUnsaved ? (
                    <Button icon="save" onClick={handleSaveChangesAsNewVersion}>
                      Save
                    </Button>
                  ) : (
                    <>
                      <Button icon="save" onClick={handleSaveChanges}>
                        Save changes
                      </Button>
                      <Button
                        icon="save"
                        onClick={handleSaveChangesAsNewVersion}
                      >
                        Save as new version
                      </Button>
                      <Button
                        icon="save"
                        onClick={handleSaveChangesAsSharedDraft}
                      >
                        Save as shared draft
                      </Button>
                      <Button icon="clear" onClick={handleDiscardChanges}>
                        Discard changes
                      </Button>
                    </>
                  )
                ) : null}
                {menuLineInfo.hasPreviousVersions ? (
                  <Button
                    icon="versions"
                    onClick={handleShowPreviousVersions}
                    customClassNames={[styles.previousVersionsButton]}
                    iconCustomClassNames={[styles.previousVersionsButtonIcon]}
                  >
                    Show previous versions
                  </Button>
                ) : null}
                {menuLineInfo.hasSharedDraft ? (
                  <Button
                    icon="user"
                    onClick={handleShowSharedDrafts}
                    customClassNames={[styles.sharedDraftsButton]}
                    iconCustomClassNames={[styles.sharedDraftsButtonIcon]}
                  >
                    Show shared drafts
                  </Button>
                ) : null}
              </dialog>
            ) : null}
          </>
        ) : (
          <div
            style={{
              width: '800px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              flex: '1',
            }}
          >
            <Skeleton hideImage={true} />
            <Skeleton hideImage={true} />
            <Skeleton hideImage={true} />
            <Skeleton hideImage={true} />
            <Skeleton hideImage={true} />
            <Skeleton hideImage={true} />
            <Skeleton hideImage={true} />
            <Skeleton hideImage={true} />
            <Skeleton hideImage={true} />
          </div>
        )}
      </div>
      {showModalDialog && menuLineContent ? (
        <div
          className={styles.modalContainer}
          onClick={handleDialogOutsideClick}
        >
          {showChangeHeadingDialog ? (
            <ScriptChangeHeadingDialog
              onOK={handleDialogOK}
              lineContent={menuLineContent}
              onHeadingLevelChange={handleHeadingLevelChanged}
            />
          ) : showChangeCharactersDialog ? (
            <ScriptChangeCharactersDialog
              onOK={handleDialogOK}
              lineContent={menuLineContent}
              characters={scriptContext?.characters ?? {}}
              onCharactersChange={handleCharactersChanged}
            />
          ) : showPreviousVersionsDialog || showSharedDraftsDialog ? (
            <ScriptLineVersionsDialog
              lineNum={lineCount}
              currentContent={menuLineContent}
              line={menuLine}
              lineInfo={menuLineInfo}
              characters={scriptContext?.characters ?? {}}
              sharedDraftContents={
                scriptContext?.getLineSharedDrafts(menuLine) ?? []
              }
              previousVersionsContents={
                scriptContext?.getLinePreviousVersions(menuLine) ?? []
              }
              onOK={handleDialogOK}
              onDeleteSharedDraft={handleDeleteSharedDraft}
              onDeletePreviousVersion={handleDeletePreviousVersion}
              onApplySharedDraftAsNewVersion={
                handleApplySharedDraftAsNewVersion
              }
              onApplyPreviousVersionAsNewVersion={
                handleApplyPreviousVersionAsNewVersion
              }
            />
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export default Script;
