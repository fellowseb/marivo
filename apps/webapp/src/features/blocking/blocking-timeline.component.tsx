import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { Track } from "./blocking.models";
import { TIMELINE_GRID_MS, TIMELINE_PX_PER_MS } from "./blocking.config";
import styles from "./blocking-timeline.module.css";

const PX_PER_MS = TIMELINE_PX_PER_MS;
const TRACK_HEIGHT_PX = 28;
const RULER_HEIGHT_PX = 20;

interface BlockingTimelineProps {
  tracks: Track[];
  playheadMs: number;
  onToggleTrack: (trackId: string) => void;
  /** visible time window — only cues intersecting it are drawn (perf) */
  windowStartMs: number;
  windowEndMs: number;
  /** ref to the shared horizontal scroller, to sync with the script strip */
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: (scrollLeft: number, clientWidth: number) => void;
}

/**
 * Multi-track timeline (wireframe v3): full-width stacked track rectangles,
 * one cue type+colour per track, shared time ruler and playhead, drawn on a
 * raw 2D canvas (not React components). Vertical scroll with max-height.
 */
export function BlockingTimeline(props: BlockingTimelineProps) {
  const { t } = useTranslation("blocking");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const totalMs = Math.max(
    1000,
    ...props.tracks.flatMap((track) => track.cues.map((cue) => cue.startMs + cue.durationMs)),
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const visibleTracks = props.tracks.filter((track) => !track.collapsed);
    const width = Math.ceil(totalMs * PX_PER_MS) + 40;
    const height = RULER_HEIGHT_PX + visibleTracks.length * TRACK_HEIGHT_PX;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    // ruler with grid marks
    ctx.strokeStyle = "#888";
    ctx.fillStyle = "#888";
    ctx.font = "10px sans-serif";
    for (let ms = 0; ms <= totalMs; ms += TIMELINE_GRID_MS) {
      const x = ms * PX_PER_MS;
      ctx.beginPath();
      ctx.moveTo(x, RULER_HEIGHT_PX - 6);
      ctx.lineTo(x, RULER_HEIGHT_PX);
      ctx.stroke();
      if (ms % (TIMELINE_GRID_MS * 2) === 0) {
        ctx.fillText(`${(ms / 1000).toFixed(1)}s`, x + 2, 10);
      }
    }
    // tracks + cues
    visibleTracks.forEach((track, row) => {
      const y = RULER_HEIGHT_PX + row * TRACK_HEIGHT_PX;
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(0, y, width, TRACK_HEIGHT_PX - 2);
      for (const cue of track.cues) {
        // perf: only draw cues intersecting the visible window (+ preload)
        if (
          cue.startMs >= props.windowEndMs ||
          cue.startMs + cue.durationMs <= props.windowStartMs
        ) {
          continue;
        }
        ctx.fillStyle = track.color;
        ctx.fillRect(
          cue.startMs * PX_PER_MS,
          y + 4,
          Math.max(2, cue.durationMs * PX_PER_MS),
          TRACK_HEIGHT_PX - 10,
        );
      }
    });
    // playhead across all tracks
    const playheadX = props.playheadMs * PX_PER_MS;
    ctx.strokeStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
  }, [props.tracks, props.playheadMs, props.windowStartMs, props.windowEndMs, totalMs]);

  return (
    <div className={styles.container} aria-label={t("timeline.label")}>
      <div className={styles.groupHeaders}>
        {props.tracks.map((track) => (
          <button
            key={track.id}
            type="button"
            className={styles.groupHeader}
            aria-expanded={!track.collapsed}
            aria-label={
              track.collapsed
                ? t("timeline.expandGroup", { label: track.label })
                : t("timeline.collapseGroup", { label: track.label })
            }
            onClick={() => props.onToggleTrack(track.id)}
          >
            <span className={styles.swatch} style={{ backgroundColor: track.color }} />
            {track.label}
          </button>
        ))}
      </div>
      <div
        ref={props.scrollRef}
        className={styles.tracksScroll}
        onScroll={(e) => props.onScroll?.(e.currentTarget.scrollLeft, e.currentTarget.clientWidth)}
      >
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>
    </div>
  );
}

export default BlockingTimeline;
