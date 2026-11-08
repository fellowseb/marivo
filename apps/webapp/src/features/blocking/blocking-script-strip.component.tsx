import { useTranslation } from "react-i18next";
import Button from "../../components/button.component";
import styles from "./blocking-script-strip.module.css";

interface BlockingScriptStripProps {
  /** name of the character speaking the current line */
  speaker: string | null;
  /** text of the réplique currently being spoken */
  lineText: string;
  playing: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  onJumpToLine: () => void;
}

/**
 * Single-line script strip (wireframe v3): the current réplique, full width,
 * with inline play / stop / jump controls at its left and the speaker name
 * displayed above the line. No time tracker / slider.
 */
export function BlockingScriptStrip(props: BlockingScriptStripProps) {
  const { t } = useTranslation("blocking");
  return (
    <div className={styles.strip} aria-label={t("scriptStrip.label")}>
      <div className={styles.speaker}>{props.speaker ?? ""}</div>
      <div className={styles.lineRow}>
        <div className={styles.controls}>
          <Button onClick={props.onPlayPause}>
            {props.playing ? t("controls.pause") : t("controls.play")}
          </Button>
          <Button onClick={props.onStop}>{t("controls.stop")}</Button>
          <Button onClick={props.onJumpToLine}>{t("controls.jumpToLine")}</Button>
        </div>
        <div className={styles.lineScroll}>
          <span className={styles.lineText}>{props.lineText}</span>
        </div>
      </div>
    </div>
  );
}

export default BlockingScriptStrip;
