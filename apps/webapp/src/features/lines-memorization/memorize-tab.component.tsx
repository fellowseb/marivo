import Script from '../../components/script.component';
import MemorizeCommands from './memorize-commands.component';
import styles from './memorize-tab.module.css';

function MemorizeTab() {
  return (
    <div className={styles.container}>
      <Script isEditable={false} />
      <div className={styles.modalContainer}>
        <MemorizeCommands />
      </div>
    </div>
  );
}

export default MemorizeTab;
