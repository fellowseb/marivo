import { useState } from 'react';
import Button from './button.components';
import styles from './script-change-characters-dialog.module.css';
import { ToggleButton } from './toggle-button.component';

export function ScriptChangeCharactersDialog() {
  const [allowMultiple, setAllowMultiple] = useState(false);
  const handleSelectMultipleToggle = (value: boolean) => {
    setAllowMultiple(value);
  };
  return (
    <dialog className={styles.dialog} open={true}>
      <h2 className={styles.title}>Select cue line characters</h2>
      <ToggleButton
        label="Select multiple"
        onToggle={handleSelectMultipleToggle}
      />
      <ul className={styles.choices}>
        <li>
          <input
            type={allowMultiple ? 'checkbox' : 'radio'}
            id="choice-0"
            name="choices"
          />
          <label htmlFor="choice-0">LA MÈRE</label>
        </li>
        <li>
          <input
            type={allowMultiple ? 'checkbox' : 'radio'}
            id="choice-1"
            name="choices"
          />
          <label htmlFor="choice-1">LE PÈRE</label>
        </li>
        {!allowMultiple ? (
          <li>
            <input
              type={allowMultiple ? 'checkbox' : 'radio'}
              id="choice-2"
              name="choices"
            />
            <label htmlFor="choice-2">ALL</label>
          </li>
        ) : null}
      </ul>
      <Button icon="accept">OK</Button>
    </dialog>
  );
}
