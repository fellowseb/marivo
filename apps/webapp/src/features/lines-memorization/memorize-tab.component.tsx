import { useScriptContext } from '../script/script.context';
import Script from '../script/script.component';
import MemorizeCommands from './memorize-commands.component';
import styles from './memorize-tab.module.css';

function MemorizeTab() {
  const scriptContext = useScriptContext();
  return (
    <div className={styles.container}>
      <Script scriptContext={scriptContext} isEditable={false} />
      <div className={styles.modalContainer}>
        <MemorizeCommands />
      </div>
    </div>
  );
}

export default MemorizeTab;
