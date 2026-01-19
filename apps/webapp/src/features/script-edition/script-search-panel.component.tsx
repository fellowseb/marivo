import Button from '../../components/button.component';
import CollapsibleSection from '../../components/collapsible-section.component';
import Panel from '../../components/panel.component';
import styles from './script-search-panel.module.css';

interface ScriptSearchPanelProps {
  onClose?: () => void;
}

function ScriptSearchPanel(props: ScriptSearchPanelProps) {
  return (
    <Panel title="Search" icon="search" onClose={props.onClose}>
      <div className={styles.searchRow}>
        <input type="search" placeholder="Text..." />
      </div>
      <CollapsibleSection Header={'▼ Options'}>
        <div className={styles.options}>
          <div className={styles.searchRow}>
            <input type="checkbox" />
            <label>search in shared drafts</label>
          </div>
          <div className={styles.searchRow}>
            <input type="checkbox" />
            <label>search in previous versions</label>
          </div>
          <div className={styles.searchRow}>
            <input type="checkbox" />
            <label>search in comments</label>
          </div>
        </div>
      </CollapsibleSection>
      <div className={styles.searchControls}>
        <Button disabled={true}>▲</Button>
        <Button disabled={true}>▼</Button>
      </div>
    </Panel>
  );
}

export default ScriptSearchPanel;
