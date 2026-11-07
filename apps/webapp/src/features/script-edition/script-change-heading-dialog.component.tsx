import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import classNames from "classnames";
import { createRef, useRef, type KeyboardEvent, type RefObject } from "react";
import Button from "../../components/button.component";
import { Dialog } from "../../components/dialog.component";
import type { HeadingLineContent, LineContent } from "../script/script.models";
import styles from "./script-change-heading-dialog.module.css";
import lineStyles from "../script/script-line.module.css";

interface ScriptChangeHeadingDialogProps {
  onOK: () => void;
  onHeadingLevelChange: (headingLevel: number) => void;
  lineContent: LineContent;
}

function makeChoices(t: TFunction<"script">) {
  return [
    {
      style: lineStyles.partNameDepth0,
      sampleText: t("headingDialog.title"),
    },
    {
      style: lineStyles.partNameDepth1,
      sampleText: t("headingDialog.act"),
    },
    {
      style: lineStyles.partNameDepth2,
      sampleText: t("headingDialog.scene"),
    },
    {
      style: lineStyles.partNameDepth3,
      sampleText: t("headingDialog.level3"),
    },
    {
      style: lineStyles.partNameDepth4,
      sampleText: t("headingDialog.level4"),
    },
  ];
}

export function ScriptChangeHeadingDialog(props: ScriptChangeHeadingDialogProps) {
  const { t } = useTranslation("script");
  const choices = makeChoices(t);
  const choicesRefs = useRef<RefObject<HTMLInputElement | null>[]>([]);
  choicesRefs.current = choices.map((_, i) => choicesRefs.current[i] ?? createRef());
  const handleOkClick = () => {
    props.onOK();
  };
  const handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      props.onOK();
    }
  };
  const handleChange = () => {
    const headings = choicesRefs.current
      .map((elem) => elem.current)
      .filter((elem) => !!elem)
      .filter((elem) => elem.checked)
      .map((elem) => parseInt(elem.id.substring("choice-".length), 10));
    props.onHeadingLevelChange(headings.length ? headings[0] : 0);
  };
  const content = props.lineContent as HeadingLineContent;
  return (
    <Dialog
      title={t("headingDialog.title2")}
      actions={
        <Button icon="accept" onClick={handleOkClick} autoFocus={true}>
          OK
        </Button>
      }
      onKeyUp={handleKeyUp}
    >
      <ul className={styles.choices}>
        {choices.map(({ style, sampleText }, idx) => (
          <li key={idx}>
            <input
              type="radio"
              id={"choice-" + idx}
              name="choices"
              checked={content.headingLevel === idx}
              onChange={handleChange}
              ref={choicesRefs.current[idx]}
            />
            <label
              htmlFor={"choice-" + idx}
              className={classNames([lineStyles.partName, style, styles.headingChoice])}
            >
              {sampleText}
            </label>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
