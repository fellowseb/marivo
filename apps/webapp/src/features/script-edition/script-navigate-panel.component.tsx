import Button from '../../components/button.component';
import Panel from '../../components/panel.component';
import styles from './script-navigate-panel.module.css';

interface ScriptNavigatePanelProps {
  outline: { heading: string; headingLevel: number }[];
  onClose?: () => void;
}

function ScriptNavigatePanel(props: ScriptNavigatePanelProps) {
  return (
    <Panel title="Navigate" icon="navigate" onClose={props.onClose}>
      <div className={styles.content}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Outline</div>
          <ul className={styles.outlineContainer}>
            {props.outline.map(({ heading, headingLevel }, idx, arr) => {
              let treeStruct =
                headingLevel === 0 ? '' : idx === arr.length - 1 ? '└' : '├';
              if (headingLevel !== 0) {
                treeStruct = treeStruct.concat(
                  ...new Array(headingLevel).fill('─'),
                );
                treeStruct += ' ';
              }
              return (
                <li>
                  <Button variant="discrete">
                    {treeStruct}
                    {heading}
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Review shared drafts: 1</div>
          <div className={styles.searchControls}>
            <Button disabled={true}>▲</Button>
            <Button disabled={true}>▼</Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export default ScriptNavigatePanel;
