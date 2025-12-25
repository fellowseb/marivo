import classNames from 'classnames';
import Button from './button.components';
import styles from './script-change-heading-dialog.module.css';
import lineStyles from './script-line.module.css';

export function ScriptChangeHeadingDialog() {
  return (
    <dialog className={styles.dialog} open={true}>
      <h2 className={styles.title}>Select heading level</h2>
      <ul className={styles.choices}>
        <li>
          <input type="radio" id="choice-0" name="choices" />
          <label
            htmlFor="choice-0"
            className={classNames([
              lineStyles.partName,
              lineStyles.partNameDepth0,
              styles.headingChoice,
            ])}
          >
            Title
          </label>
        </li>
        <li>
          <input type="radio" id="choice-1" name="choices" />
          <label
            htmlFor="choice-1"
            className={classNames([
              lineStyles.partName,
              lineStyles.partNameDepth1,
              styles.headingChoice,
            ])}
          >
            Act
          </label>
        </li>
        <li>
          <input type="radio" id="choice-2" name="choices" />
          <label
            htmlFor="choice-2"
            className={classNames([
              lineStyles.partName,
              lineStyles.partNameDepth2,
              styles.headingChoice,
            ])}
          >
            Scene
          </label>
        </li>
        <li>
          <input type="radio" id="choice-3" name="choices" />
          <label
            htmlFor="choice-3"
            className={classNames([
              lineStyles.partName,
              lineStyles.partNameDepth3,
              styles.headingChoice,
            ])}
          >
            Heading (level 3)
          </label>
        </li>
        <li>
          <input type="radio" id="choice-4" name="choices" />
          <label
            htmlFor="choice-4"
            className={classNames([
              lineStyles.partName,
              lineStyles.partNameDepth4,
              styles.headingChoice,
            ])}
          >
            Heading (level 4)
          </label>
        </li>
      </ul>
      <Button icon="accept">OK</Button>
    </dialog>
  );
}
