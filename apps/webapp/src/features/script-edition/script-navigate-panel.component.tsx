import Button from '../../components/button.component';
import Panel from '../../components/panel.component';
import styles from './script-navigate-panel.module.css';

interface ScriptNavigatePanelProps {
  outline: { heading: string; headingLevel: number }[];
  onClose?: () => void;
}

function ScriptNavigatePanel(props: ScriptNavigatePanelProps) {
  const handleHeadingClick = (lineId: string) => () => {
    const elem = document.getElementById(`script-line-${lineId}`);
    if (!elem) {
      return;
    }
    window.scrollBy({
      top: elem.offsetTop - window.pageYOffset,
      left: 0,
      behavior: 'instant',
    });
  };
  return (
    <Panel title="Navigate" icon="navigate" onClose={props.onClose}>
      <div className={styles.content}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Outline</div>
          <ul className={styles.outlineContainer}>
            {props.outline.map(
              ({ heading, headingLevel, lineId }, idx, arr) => {
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
                    <Button
                      variant="discrete"
                      onClick={handleHeadingClick(lineId)}
                    >
                      {treeStruct}
                      {heading}
                    </Button>
                  </li>
                );
              },
            )}
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
