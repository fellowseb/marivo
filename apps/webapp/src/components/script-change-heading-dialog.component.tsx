import classNames from 'classnames';
import { createRef, useRef, type RefObject } from 'react';
import Button from './button.component';
import styles from './script-change-heading-dialog.module.css';
import lineStyles from './script-line.module.css';
import type { LineContentInfo } from '../features/script-edition/script.context';
import type { HeadingLineContent } from './script.models';
import { Dialog } from './dialog.component';

interface ScriptChangeHeadingDialogProps {
  onOK: () => void;
  onHeadingLevelChange: (headingLevel: number) => void;
  lineContentInfo: LineContentInfo;
}

const CHOICES = [
  {
    style: lineStyles.partNameDepth0,
    sampleText: 'Title',
  },
  {
    style: lineStyles.partNameDepth1,
    sampleText: 'Act',
  },
  {
    style: lineStyles.partNameDepth2,
    sampleText: 'Scene',
  },
  {
    style: lineStyles.partNameDepth3,
    sampleText: 'Heading (level 3)',
  },
  {
    style: lineStyles.partNameDepth4,
    sampleText: 'Heading (level 4)',
  },
];

export function ScriptChangeHeadingDialog(
  props: ScriptChangeHeadingDialogProps,
) {
  const choicesRefs = useRef<RefObject<HTMLInputElement | null>[]>([]);
  choicesRefs.current = CHOICES.map(
    (_, i) => choicesRefs.current[i] ?? createRef(),
  );
  const handleOkClick = () => {
    props.onOK();
  };
  const handleChange = () => {
    const headings = choicesRefs.current
      .map((elem) => elem.current)
      .filter((elem) => !!elem)
      .filter((elem) => elem.checked)
      .map((elem) => parseInt(elem.id.substring('choice-'.length), 10));
    props.onHeadingLevelChange(headings.length ? headings[0] : 0);
  };
  const content = props.lineContentInfo.content as HeadingLineContent;
  return (
    <Dialog
      title="Select heading level"
      actions={
        <Button icon="accept" onClick={handleOkClick}>
          OK
        </Button>
      }
    >
      <ul className={styles.choices}>
        {CHOICES.map(({ style, sampleText }, idx) => (
          <li key={idx}>
            <input
              type="radio"
              id={'choice-' + idx}
              name="choices"
              checked={content.headingLevel === idx}
              onChange={handleChange}
              ref={choicesRefs.current[idx]}
            />
            <label
              htmlFor={'choice-' + idx}
              className={classNames([
                lineStyles.partName,
                style,
                styles.headingChoice,
              ])}
            >
              {sampleText}
            </label>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
