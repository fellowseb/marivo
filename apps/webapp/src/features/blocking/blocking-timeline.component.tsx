import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Track } from "./blocking.models";
import { MAX_CANVAS_WIDTH_PX, TIMELINE_GRID_MS } from "./blocking.config";
import styles from "./blocking-timeline.module.css";

const TRACK_HEIGHT_PX = 20;
const RULER_HEIGHT_PX = 20;
/** band above the ruler where line labels are drawn */
const LINE_BAND_PX = 24;
/** below this cue width (px), the label is hidden */
const MIN_LABEL_PX = 48;
/** max label width (px), even for wide cues */
const MAX_LABEL_PX = 220;

interface BlockingTimelineProps {
  tracks: Track[];
  playheadMs: number;
  onToggleTrack: (trackId: string) => void;
  /** visible time window — only cues intersecting it are drawn (perf) */
  windowStartMs: number;
  windowEndMs: number;
  /** line labels keyed by line id, drawn on the line band at their lineAudio cue position */
  lineLabels?: Map<string, { text: string; speaker: string | null }>;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = props.scrollRef;
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  // hover tooltip: hit-test the lineAudio cues under the cursor
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const scroller = scrollRef?.current;
    const container = containerRef.current;
    if (!scroller || !container || !props.lineLabels) {
      setTooltip(null);
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    const x = e.clientX - scrollerRect.left;
    const y = e.clientY - scrollerRect.top;
    // only the line band shows tooltips
    if (y < 0 || y > LINE_BAND_PX || x < 0 || x > scroller.clientWidth) {
      setTooltip(null);
      return;
    }
    const startMs = props.windowStartMs;
    const endMs = Math.max(props.windowEndMs, startMs + 1);
    const ms = startMs + (x / scroller.clientWidth) * (endMs - startMs);
    const audioTrack = props.tracks.find((track) => track.kind === "lineAudio");
    const cue = audioTrack?.cues.find((c) => ms >= c.startMs && ms < c.startMs + c.durationMs);
    const label = cue ? props.lineLabels.get(cue.data?.lineId as string) : undefined;
    if (label) {
      setTooltip({
        x: e.clientX - containerRect.left + 12,
        y: e.clientY - containerRect.top + 12,
        text: label.speaker ? `${label.speaker} — ${label.text}` : label.text,
      });
    } else {
      setTooltip(null);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const scroller = scrollRef?.current;
    if (!canvas) return;
    // canvas is viewport-sized, capped to stay well under browser limits
    const viewWidth = scroller?.clientWidth ?? 800;
    const width = Math.min(Math.max(50, Math.floor(viewWidth)), MAX_CANVAS_WIDTH_PX);
    const visibleTracks = props.tracks.filter((track) => !track.collapsed);
    const height = LINE_BAND_PX + RULER_HEIGHT_PX + visibleTracks.length * TRACK_HEIGHT_PX;
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

    // line labels in the band ABOVE the ruler, each at its lineAudio cue's
    // position; truncated with an ellipsis to the cue width (measured, no hard
    // clip), hidden when the cue is too narrow, capped at MAX_LABEL_PX
    const textColor =
      getComputedStyle(document.documentElement).getPropertyValue("--color-text").trim() || "#000";
    ctx.fillStyle = textColor;
    ctx.font = "14px sans-serif";
    const audioTrack = props.tracks.find((track) => track.kind === "lineAudio");
    if (audioTrack && props.lineLabels) {
      for (const cue of audioTrack.cues) {
        if (cue.startMs >= endMs || cue.startMs + cue.durationMs <= startMs) continue;
        const label = props.lineLabels.get(cue.data?.lineId as string);
        if (!label) continue;
        const x = toX(cue.startMs);
        const cueW = Math.max(4, cue.durationMs * pxPerMs);
        const labelW = Math.min(cueW - 4, MAX_LABEL_PX);
        if (labelW < MIN_LABEL_PX - 4) continue; // too narrow: no label
        let text = label.text;
        while (text.length > 1 && ctx.measureText(text + "…").width > labelW) {
          text = text.slice(0, -1);
        }
        if (text !== label.text) text += "…";
        ctx.fillText(text, x + 2, 17);
      }
    }
    // ruler with grid marks (below the line band)
    ctx.strokeStyle = "#888";
    ctx.fillStyle = "#888";
    ctx.font = "10px sans-serif";
    const gridStep = TIMELINE_GRID_MS;
    const firstGrid = Math.ceil(startMs / gridStep) * gridStep;
    for (let ms = firstGrid; ms <= endMs; ms += gridStep) {
      const x = toX(ms);
      ctx.beginPath();
      ctx.moveTo(x, LINE_BAND_PX + RULER_HEIGHT_PX - 6);
      ctx.lineTo(x, LINE_BAND_PX + RULER_HEIGHT_PX);
      ctx.stroke();
      // labels at whole-second precision only
      if (ms % 1000 === 0 && ms >= 0) {
        ctx.fillText(`${Math.round(ms / 1000)}s`, x + 2, LINE_BAND_PX + 10);
      }
    }
    // tracks + cues (only cues inside the window are painted)
    visibleTracks.forEach((track, row) => {
      const y = LINE_BAND_PX + RULER_HEIGHT_PX + row * TRACK_HEIGHT_PX;
      ctx.fillStyle = "#DEDEDE";
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
    // playhead (stays centered: the window is centered on it), spanning the line band too
    const playheadX = toX(props.playheadMs);
    ctx.strokeStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
  }, [
    props.tracks,
    props.playheadMs,
    props.windowStartMs,
    props.windowEndMs,
    props.lineLabels,
    scrollRef,
  ]);

  return (
    <div
      ref={containerRef}
      className={styles.container}
      aria-label={t("timeline.label")}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTooltip(null)}
    >
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
      {tooltip && (
        <div className={styles.tooltip} style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

export default BlockingTimeline;
