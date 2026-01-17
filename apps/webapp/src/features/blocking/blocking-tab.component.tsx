import { useScriptContext } from '../script/script.context';
import Script from '../script/script.component';
import styles from './blocking-tab.module.css';

function BlockingTab() {
  const scriptContext = useScriptContext();
  return (
    <div className={styles.container}>
      <Script scriptContext={scriptContext} isEditable={false} />
      <div className={styles.stagingPanelsContainer}>
        <div className={styles.blockingPanel}></div>
      </div>
    </div>
  );
}

export default BlockingTab;
