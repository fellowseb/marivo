import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { Track } from "./blocking.models";
import { MAX_CANVAS_WIDTH_PX, TIMELINE_GRID_MS } from "./blocking.config";
import styles from "./blocking-timeline.module.css";

const TRACK_HEIGHT_PX = 28;
const RULER_HEIGHT_PX = 20;

interface BlockingTimelineProps {
  tracks: Track[];
  playheadMs: number;
  onToggleTrack: (trackId: string) => void;
  /** visible time window — only cues intersecting it are drawn (perf) */
  windowStartMs: number;
  windowEndMs: number;
  /** ref to the horizontal scroller, synced with the script strip */
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: (scrollLeft: number, clientWidth: number) => void;
}

/**
 * Multi-track timeline (wireframe v3): full-width stacked track rectangles,
 * one cue type+colour per track, shared ruler + playhead, drawn on a raw 2D
 * canvas. The canvas is viewport-sized (never the whole timeline, to avoid
 * the browser canvas-size limit on big scripts) and only the window around
 * the playhead is painted. The horizontal scrollbar is hidden; the scroller
 * is positioned programmatically to keep the playhead centered.
 */
export function BlockingTimeline(props: BlockingTimelineProps) {
  const { t } = useTranslation("blocking");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = props.scrollRef;

  useEffect(() => {
    const canvas = canvasRef.current;
    const scroller = scrollRef?.current;
    if (!canvas) return;
    // canvas is viewport-sized, capped to stay well under browser limits
    const viewWidth = scroller?.clientWidth ?? 800;
    const width = Math.min(Math.max(50, Math.floor(viewWidth)), MAX_CANVAS_WIDTH_PX);
    const visibleTracks = props.tracks.filter((track) => !track.collapsed);
    const height = RULER_HEIGHT_PX + visibleTracks.length * TRACK_HEIGHT_PX;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    // map the visible ms window onto the viewport-sized canvas
    const startMs = props.windowStartMs;
    const endMs = Math.max(props.windowEndMs, startMs + 1);
    const pxPerMs = width / (endMs - startMs);
    const toX = (ms: number) => (ms - startMs) * pxPerMs;

    // ruler with grid marks
    ctx.strokeStyle = "#888";
    ctx.fillStyle = "#888";
    ctx.font = "10px sans-serif";
    const gridStep = TIMELINE_GRID_MS;
    const firstGrid = Math.ceil(startMs / gridStep) * gridStep;
    for (let ms = firstGrid; ms <= endMs; ms += gridStep) {
      const x = toX(ms);
      ctx.beginPath();
      ctx.moveTo(x, RULER_HEIGHT_PX - 6);
      ctx.lineTo(x, RULER_HEIGHT_PX);
      ctx.stroke();
      if (ms % (gridStep * 2) === 0) {
        ctx.fillText(`${(ms / 1000).toFixed(1)}s`, x + 2, 10);
      }
    }
    // tracks + cues (only cues inside the window are painted)
    visibleTracks.forEach((track, row) => {
      const y = RULER_HEIGHT_PX + row * TRACK_HEIGHT_PX;
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(0, y, width, TRACK_HEIGHT_PX - 2);
      for (const cue of track.cues) {
        if (cue.startMs >= endMs || cue.startMs + cue.durationMs <= startMs) continue;
        ctx.fillStyle = track.color;
        ctx.fillRect(
          toX(cue.startMs),
          y + 4,
          Math.max(2, cue.durationMs * pxPerMs),
          TRACK_HEIGHT_PX - 10,
        );
      }
    });
    // playhead (stays centered: the window is centered on it)
    const playheadX = toX(props.playheadMs);
    ctx.strokeStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
  }, [props.tracks, props.playheadMs, props.windowStartMs, props.windowEndMs, scrollRef]);

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
