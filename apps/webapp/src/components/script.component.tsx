import classNames from 'classnames';
import { useEffect, useState } from 'react';
import { Fragment } from 'react/jsx-runtime';
import Button from './button.components';
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
  const info = lineIdForMenu
    ? (scriptContext?.getLineContentInfo(
        scriptContext?.lines.get(lineIdForMenu)!,
      ) ?? null)
    : null;
  const handleShowLineMenu = (id: string) => {
    setLineIdForMenu((prev) => {
      if (prev !== id) {
        return id;
      }
      return prev ? null : id;
    });
    setShowChangeHeadingDialog(false);
    setShowChangeCharactersDialog(false);
  };
  const handleDiscardChanges = () => {
    if (lineIdForMenu) {
      scriptContext?.discardChanges(lineIdForMenu);
    }
  };
  const handleSaveChanges = () => {
    if (lineIdForMenu) {
      scriptContext?.saveChanges(lineIdForMenu);
    }
  };
  const handleSaveChangesAsNewVersion = () => {
    if (lineIdForMenu) {
      scriptContext?.saveChangesAsNewVersion(lineIdForMenu);
    }
  };
  const handleSaveChangesAsSharedDraft = () => {
    if (lineIdForMenu) {
      scriptContext?.saveChangesAsSharedDraft(lineIdForMenu);
    }
  };
  const handleDeleteLine = () => {
    if (lineIdForMenu) {
      const line = scriptContext?.lines.get(lineIdForMenu)!;
      const { content } = scriptContext?.getLineContentInfo(line);
      scriptContext?.initDraft(content, undefined, true);
    }
  };
  const handleChangeHeadingLevel = () => {
    setShowChangeHeadingDialog(true);
  };
  const handleChangeCharacters = () => {
    setShowChangeCharactersDialog(true);
  };
  const handleDialogOK = () => {
    setShowChangeHeadingDialog(false);
    setShowChangeCharactersDialog(false);
    setLineIdForMenu(null);
  };
  const handleHeadingLevelChanged = (headingLevel: number) => {
    if (lineIdForMenu) {
      scriptContext?.editLine(lineIdForMenu, {
        deleted: info?.content?.deleted,
        text: info?.content?.text ?? '',
        lineType: 'heading',
        headingLevel,
      } satisfies HeadingLineEditableContent);
    }
  };
  const handleCharactersChanged = (characters: string[]) => {
    if (lineIdForMenu) {
      scriptContext?.editLine(lineIdForMenu, {
        characters,
        deleted: info?.content?.deleted,
        text: info?.content?.text ?? '',
        lineType: 'chartext',
      } satisfies CueLineEditableContent);
    }
  };
  const showModalDialog =
    info && (showChangeHeadingDialog || showChangeCharactersDialog);
  return (
    <>
      <div className={styles.scriptContent} onClick={handleClick}>
        {scriptContext ? (
          <>
            {scriptContext.linesOrder.map((lineId, i) => {
              const lineData = scriptContext.lines.get(lineId);
              if (!lineData) {
                return null;
              }
              const lineContentInfo =
                scriptContext.getLineContentInfo(lineData);
              if (lineData.type === 'chartext') {
                ++lineCount;
              }
              const selected = selectedLines.has(lineData.id);
              return (
                <Fragment key={lineData.id}>
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
                    newlyInserted={insertedLineId === lineData.id}
                    num={lineCount}
                    line={lineData}
                    characters={scriptContext.characters}
                    key={lineData.id}
                    isEditable={props.isEditable}
                    lineContentInfo={lineContentInfo}
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
            {info && !showChangeHeadingDialog && !showChangeCharactersDialog ? (
              <dialog
                className={classNames({
                  [styles.menu]: true,
                })}
                style={{
                  positionAnchor: '--menu-anchor-' + lineIdForMenu,
                }}
                open={true}
              >
                {info.content.lineType === 'heading' ? (
                  <Button icon="heading" onClick={handleChangeHeadingLevel}>
                    Change heading level
                  </Button>
                ) : null}
                {info.content.lineType === 'chartext' ? (
                  <Button icon="characterLine" onClick={handleChangeCharacters}>
                    Change characters
                  </Button>
                ) : null}
                {
                  <Button icon="delete" onClick={handleDeleteLine}>
                    Remove line
                  </Button>
                }
                {info.hasDraft ? (
                  info.isNewUnsaved ? (
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
                {info.hasPreviousVersions ? (
                  <Button icon="versions">Show previous versions</Button>
                ) : null}
                {info.hasSharedDraft ? (
                  <Button icon="user">Show shared drafts</Button>
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
      {showModalDialog ? (
        <div className={styles.modalContainer}>
          {showChangeHeadingDialog ? (
            <ScriptChangeHeadingDialog
              onOK={handleDialogOK}
              lineContentInfo={info}
              onHeadingLevelChange={handleHeadingLevelChanged}
            />
          ) : showChangeCharactersDialog ? (
            <ScriptChangeCharactersDialog
              onOK={handleDialogOK}
              lineContentInfo={info}
              characters={scriptContext?.characters ?? {}}
              onCharactersChange={handleCharactersChanged}
            />
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export default Script;
