import Script from '../../components/script.component';
import MemorizeCommands from './memorize-commands.component';
import styles from './memorize-tab.module.css';

function MemorizeTab() {
  return (
    <div className={styles.container}>
      <MemorizeCommands />
      <Script
        isEditable={false}
        hideLinesOf={['LA MÈRE', 'LE PÈRE', 'LA MARIÉE']}
      />
    </div>
  );
}

export default MemorizeTab;
