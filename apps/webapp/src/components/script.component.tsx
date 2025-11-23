import { useEffect, useState } from 'react';
import { Fragment } from 'react/jsx-runtime';
import ScriptLine, { ScriptLineToBe } from './script-line.component';
import styles from './script.module.css';
import Skeleton from './skeleton.component';
import { useScriptContext } from '../features/script-edition/script.context';
import type { LineContent } from './script.models';
import classNames from 'classnames';
import Button from './button.components';

interface ScriptProps {
  isEditable: boolean;
  hideLinesOf?: string[];
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
  const handleDeleteLine = () => {
    if (lineIdForMenu) {
      const line = scriptContext?.lines.get(lineIdForMenu)!;
      const { content } = scriptContext?.getLineContentInfo(line);
      scriptContext?.initDraft(content, undefined, true);
    }
  };
  return (
    <div className={styles.scriptContent} onClick={handleClick}>
      {scriptContext ? (
        <>
          {scriptContext.linesOrder.map((lineId, i) => {
            const lineData = scriptContext.lines.get(lineId);
            if (!lineData) {
              return null;
            }
            const lineContentInfo = scriptContext.getLineContentInfo(lineData);
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
                  newlyInserted={insertedLineId === lineData.id}
                  num={lineCount}
                  line={lineData}
                  characters={scriptContext.characters}
                  key={lineData.id}
                  isEditable={props.isEditable}
                  hideLinesOf={props.hideLinesOf}
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
          {info ? (
            <dialog
              className={classNames({
                [styles.menu]: true,
              })}
              style={{
                positionAnchor: '--menu-anchor-' + lineIdForMenu,
              }}
              open={true}
            >
              {
                <Button icon="delete" onClick={handleDeleteLine}>
                  Remove line
                </Button>
              }
              {info.hasDraft ? (
                info.isNewUnsaved ? (
                  <Button icon="save">Save</Button>
                ) : (
                  <>
                    <Button icon="save" onClick={handleSaveChanges}>
                      Save changes
                    </Button>
                    <Button icon="save">Save as new version</Button>
                    <Button icon="save">Save as shared draft</Button>
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
  );
}

export default Script;
