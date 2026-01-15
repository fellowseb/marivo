import Button from './button.component';
import CollapsibleSection from './collapsible-section.component';
import Icon from './icon.component';
import styles from './script-search-panel.module.css';

function ScriptSearchPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <Icon value="search" mode="primary" size="small" />
        Search
      </div>
      <div className={styles.content}>
        <div className={styles.searchRow}>
          <input type="search" placeholder="Text..." />
          <Button icon="clear" disabled={true} />
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
          </div>
        </CollapsibleSection>
        <div className={styles.searchControls}>
          <Button disabled={true}>▲</Button>
          <Button disabled={true}>▼</Button>
        </div>
      </div>
    </div>
  );
}

export default ScriptSearchPanel;
