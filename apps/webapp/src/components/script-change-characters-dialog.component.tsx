import { createRef, useRef, useState, type RefObject } from 'react';
import Button from './button.component';
import styles from './script-change-characters-dialog.module.css';
import { ToggleButton } from './toggle-button.component';
import type {
  LineContentInfo,
  ScriptContext,
} from '../features/script-edition/script.context';
import type { CueLineContent } from './script.models';
import { Dialog } from './dialog.component';

interface ScriptChangeCharactersDialogProps {
  onOK: () => void;
  onCharactersChange: (characters: string[]) => void;
  lineContentInfo: LineContentInfo;
  characters: ScriptContext['characters'];
}

export function ScriptChangeCharactersDialog(
  props: ScriptChangeCharactersDialogProps,
) {
  const choicesRefs = useRef<RefObject<HTMLInputElement | null>[]>([]);
  choicesRefs.current = Object.keys(props.characters).map(
    (_, i) => choicesRefs.current[i] ?? createRef(),
  );
  const allRef = useRef<HTMLInputElement>(null);
  const content = props.lineContentInfo.content as CueLineContent;
  const [allowMultiple, setAllowMultiple] = useState(
    content.characters.length > 1,
  );
  const handleSelectMultipleToggle = (value: boolean) => {
    setAllowMultiple(value);
    handleChange();
  };
  const handleOkClick = () => {
    props.onOK();
  };
  const handleChange = () => {
    const characters = choicesRefs.current
      .concat(allRef)
      .map((elem) => elem.current)
      .filter((elem) => !!elem)
      .filter((elem) => elem.checked)
      .map((elem) => elem.id.substring('choice-'.length));
    props.onCharactersChange(characters);
  };
  return (
    <Dialog
      title="Select cue line characters"
      actions={
        <Button icon="accept" onClick={handleOkClick}>
          OK
        </Button>
      }
    >
      <ToggleButton
        label="Select multiple"
        onToggle={handleSelectMultipleToggle}
        value={allowMultiple}
      />
      <ul className={styles.choices}>
        {Object.keys(props.characters).map((charId, i) => {
          return (
            <li key={charId}>
              <input
                type={allowMultiple ? 'checkbox' : 'radio'}
                id={'choice-' + charId}
                name="choices"
                checked={content.characters.includes(charId)}
                onChange={handleChange}
                ref={choicesRefs.current[i]}
              />
              <label htmlFor={'choice-' + charId}>
                {props.characters[charId]}
              </label>
            </li>
          );
        })}
        {!allowMultiple ? (
          <li>
            <input
              type={allowMultiple ? 'checkbox' : 'radio'}
              id="choice-ALL"
              name="choices"
              checked={content.characters.includes('ALL')}
              ref={allRef}
              onChange={handleChange}
            />
            <label htmlFor="choice-ALL">ALL</label>
          </li>
        ) : null}
      </ul>
    </Dialog>
  );
}
