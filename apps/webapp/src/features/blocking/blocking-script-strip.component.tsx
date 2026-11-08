import { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import Button from "../../components/button.component";
import styles from "./blocking-script-strip.module.css";

export interface StripLine {
  id: string;
  text: string;
  speaker: string | null;
  startMs: number;
  durationMs: number;
}

interface BlockingScriptStripProps {
  /** all script lines, as one continuous flow (windowed rendering) */
  lines: StripLine[];
  /** currently spoken line id (playhead position) */
  currentLineId: string | null;
  /** visible time window — only lines intersecting it are rendered */
  windowStartMs: number;
  windowEndMs: number;
  playing: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  onJumpToLine: () => void;
  onLineScroll?: (scrollLeft: number, clientWidth: number) => void;
}

/**
 * Script strip (wireframe v3): the whole script rendered as ONE continuous
 * line, full width, horizontal scrolling synced with the timeline. Only the
 * lines inside the visible window (+ preload) are in the DOM. The speaker
 * name above and the inline play/stop/jump controls sit in a fixed column.
 */
export const BlockingScriptStrip = forwardRef<HTMLDivElement, BlockingScriptStripProps>(
  function BlockingScriptStrip(props, lineScrollRef) {
    const { t } = useTranslation("blocking");
    const visibleLines = props.lines.filter(
      (line) =>
        line.startMs < props.windowEndMs && line.startMs + line.durationMs > props.windowStartMs,
    );
    const currentLine = props.lines.find((line) => line.id === props.currentLineId);
    return (
      <div className={styles.strip} aria-label={t("scriptStrip.label")}>
        <div className={styles.fixedCol}>
          <div className={styles.speaker}>{currentLine?.speaker ?? ""}</div>
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
          onScroll={(e) =>
            props.onLineScroll?.(e.currentTarget.scrollLeft, e.currentTarget.clientWidth)
          }
        >
          <span className={styles.lineFlow}>
            {visibleLines.map((line) => (
              <span
                key={line.id}
                data-line-id={line.id}
                className={
                  line.id === props.currentLineId
                    ? `${styles.linePart} ${styles.currentLine}`
                    : styles.linePart
                }
              >
                {line.text}{" "}
              </span>
            ))}
          </span>
        </div>
      </div>
    );
  },
);

export default BlockingScriptStrip;
