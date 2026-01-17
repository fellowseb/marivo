import {
  createRef,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import Button from '../../components/button.component';
import { ToggleButton } from '../../components/toggle-button.component';
import { Dialog } from '../../components/dialog.component';
import styles from './script-change-characters-dialog.module.css';
import type { CueLineContent, LineContent } from '../script/script.models';
import type { ScriptContext } from '../script/script.context';

interface ScriptChangeCharactersDialogProps {
  onOK: () => void;
  onCharactersChange: (characters: string[]) => void;
  lineContent: LineContent;
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
  const content = props.lineContent as CueLineContent;
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
  const handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      props.onOK();
    }
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
        <Button icon="accept" onClick={handleOkClick} autoFocus={true}>
          OK
        </Button>
      }
      onKeyUp={handleKeyUp}
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
