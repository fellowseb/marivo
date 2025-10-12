import Script from '../../components/script.component';
import styles from './script-tab.module.css';

function ScriptTab() {
  return (
    <div className={styles.container}>
      <Script isEditable={true} />
    </div>
  );
}

export default ScriptTab;
