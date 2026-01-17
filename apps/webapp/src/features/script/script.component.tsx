import { useEffect, useState } from 'react';
import { Fragment } from 'react/jsx-runtime';
import Skeleton from '../../components/skeleton.component';
import ScriptLine, { ScriptLineToBe } from './script-line.component';
import styles from './script.module.css';
import type { ScriptContext, ScriptEditionContext } from './script.context';
import type { LineContent, LineEditableContent } from './script.models';

interface ScriptProps {
  scriptContext: ScriptContext | null;
  scriptEditionContext?: ScriptEditionContext | null;
  isEditable: boolean;
  onLineMenuClicked?: (id: string) => void;
  onLineDraftTextEdit?: (id: string, text: string) => void;
  onLineDraftInit?: (
    content: LineContent,
    text?: string,
    deleted?: boolean,
  ) => void;
  onLineEdit?: (id: string, content: LineEditableContent) => void;
}

function Script(props: ScriptProps) {
  const { scriptContext, scriptEditionContext } = props;
  const [selectedLines, setSelectedLines] = useState(new Set<string>());
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
  let lineCount = 0;
  return (
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
            return isDeletedSavedLine ? null : (
              <Fragment key={line.id}>
                {props.isEditable ? (
                  <ScriptLineToBe
                    insertCueLine={scriptEditionContext?.insertCueLine}
                    insertFreetextLine={
                      scriptEditionContext?.insertFreetextLine
                    }
                    insertHeading={scriptEditionContext?.insertHeading}
                    characters={scriptContext.characters}
                    pos={i}
                  />
                ) : null}
                <ScriptLine
                  selected={selected}
                  onShowMenu={props.onLineMenuClicked}
                  onSelect={handleSelectLine}
                  onDraftTextEdit={props.onLineDraftTextEdit}
                  onDraftInit={props.onLineDraftInit}
                  onEdit={props.onLineEdit}
                  newlyInserted={
                    props.scriptEditionContext?.insertedLineId === line.id
                  }
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
              insertCueLine={scriptEditionContext?.insertCueLine}
              insertFreetextLine={scriptEditionContext?.insertFreetextLine}
              insertHeading={scriptEditionContext?.insertHeading}
              characters={scriptContext.characters}
              pos={scriptContext.linesOrder.length}
            />
          ) : null}
        </>
      ) : (
        <div className={styles.skeletonContainer}>
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
