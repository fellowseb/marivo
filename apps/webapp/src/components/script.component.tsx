import ScriptLine, { ScriptLineToBe } from './script-line.component';
import styles from './script.module.css';
import Skeleton from './skeleton.component';
import { useScriptContext } from '../features/script-edition/script.context';

interface ScriptProps {
  isEditable: boolean;
  hideLinesOf?: string[];
}

function Script(props: ScriptProps) {
  let lineCount = 0;
  const scriptContext = useScriptContext();
  return (
    <div className={styles.scriptContent}>
      {scriptContext ? (
        <>
          {scriptContext.linesOrder.map((lineId, i) => {
            const lineData = scriptContext.lines.get(lineId);
            if (!lineData) {
              return null;
            }
            if (lineData.type === 'chartext') {
              ++lineCount;
            }
            return (
              <>
                <ScriptLineToBe context={scriptContext} pos={i} />
                <ScriptLine
                  lines={scriptContext.lines}
                  num={lineCount}
                  line={lineData}
                  key={lineData.id}
                  isEditable={props.isEditable}
                  hideLinesOf={props.hideLinesOf}
                />
              </>
            );
          })}
          <ScriptLineToBe
            context={scriptContext}
            pos={scriptContext.linesOrder.length}
          />
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
