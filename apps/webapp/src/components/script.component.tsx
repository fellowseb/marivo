import classNames from 'classnames';
import { playsDetails } from '../mock-data';
import ScriptLine from './script-line.component';
import type { PartName, Script as ScriptModel } from './script.models';
import styles from './script.module.css';
import { isPart } from './script.utils';
import Skeleton from './skeleton.component';

interface ScriptPartProps {
  line: PartName;
  isEditable: boolean;
  hideLinesOf?: string[];
}

function ScriptPart(props: ScriptPartProps) {
  return (
    <div
      className={classNames({
        [styles.partName]: true,
        [styles.partNameDepth0]: props.line.depth === 0,
        [styles.partNameDepth1]: props.line.depth === 1,
        [styles.partNameDepth2]: props.line.depth === 2,
        [styles.partNameDepth3]: props.line.depth === 3,
        [styles.partNameDepth4]: props.line.depth === 4,
        [styles.partNameDepth5]: props.line.depth === 5,
      })}
    >
      {props.line.partName}
    </div>
  );
}

interface ScriptProps {
  isEditable: boolean;
  hideLinesOf?: string[];
}

function Script(props: ScriptProps) {
  let lineCount = 0;
  // const script = playsDetails['la-noce-b86a57e9cef0'].script as ScriptModel;
  let script: ScriptModel | undefined;
  return (
    <div className={styles.scriptContent}>
      {script ? (
        script.lines.map((line, i) => {
          return isPart(line) ? (
            <ScriptPart
              line={line}
              key={i}
              isEditable={props.isEditable}
              hideLinesOf={props.hideLinesOf}
            />
          ) : (
            <ScriptLine
              num={++lineCount}
              line={line}
              key={i}
              isEditable={props.isEditable}
              hideLinesOf={props.hideLinesOf}
            />
          );
        })
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
