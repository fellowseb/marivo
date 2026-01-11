import Button from '../../components/button.component';
import { Dialog } from '../../components/dialog.component';
import styles from './memorize-commands.module.css';

function MemorizeCommands() {
  return (
    <Dialog
      title="Start Session"
      actions={<Button icon="accept">Start</Button>}
    >
      <div className={styles.playOptions}>
        <div className={styles.playOptionsLine}>
          <label>Character</label>
          <select>
            <option>LA MÈRE</option>
          </select>
        </div>
        <div className={styles.playOptionsLine}>
          <label>Parts</label>
          <select>
            <option>Whole Play</option>
            <option>Act I</option>
            <option>Act I - Scene 1</option>
          </select>
        </div>
        <div className={styles.playOptionsLine}>
          <label>Randomize lines</label>
          <input type="checkbox" />
        </div>
        <div className={styles.playOptionsLine}>
          <label>Only cue lines</label>
          <input type="checkbox" />
        </div>
        <div className={styles.playOptionsLine}>
          <label>Hide my lines</label>
          <input type="checkbox" />
        </div>
      </div>
    </Dialog>
  );
}

export default MemorizeCommands;
