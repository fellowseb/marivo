import Script from '../../components/script.component';
import styles from './blocking-tab.module.css';

function BlockingTab() {
  return (
    <div className={styles.container}>
      <Script isEditable={false} />
      <div className={styles.stagingPanelsContainer}>
        <div className={styles.blockingPanel}></div>
      </div>
    </div>
  );
}

export default BlockingTab;
