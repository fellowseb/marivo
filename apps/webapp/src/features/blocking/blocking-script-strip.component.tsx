import { forwardRef } from "react";
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
  /** fired when the line strip scrolls horizontally (to sync the timeline) */
  onLineScroll?: (scrollLeft: number) => void;
}

/**
 * Single-line script strip (wireframe v3): speaker name above the line,
 * play / stop / jump controls inline at the left, line scrolls horizontally
 * inside the strip only (the page itself never scrolls).
 */
export const BlockingScriptStrip = forwardRef<HTMLDivElement, BlockingScriptStripProps>(
  function BlockingScriptStrip(props, lineScrollRef) {
    const { t } = useTranslation("blocking");
    return (
      <div className={styles.strip} aria-label={t("scriptStrip.label")}>
        <div className={styles.fixedCol}>
          <div className={styles.speaker}>{props.speaker ?? ""}</div>
          <div className={styles.controls}>
            <Button onClick={props.onPlayPause}>
              {props.playing ? t("controls.pause") : t("controls.play")}
            </Button>
            <Button onClick={props.onStop}>{t("controls.stop")}</Button>
            <Button onClick={props.onJumpToLine}>{t("controls.jumpToLine")}</Button>
          </div>
        </div>
        <div
          ref={lineScrollRef}
          className={styles.lineScroll}
          onScroll={(e) => props.onLineScroll?.(e.currentTarget.scrollLeft)}
        >
          <span className={styles.lineText}>{props.lineText}</span>
        </div>
      </div>
    );
  },
);

export default BlockingScriptStrip;
