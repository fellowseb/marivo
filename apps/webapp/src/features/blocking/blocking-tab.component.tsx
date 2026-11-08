import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useScriptContext } from "../script/script.context";
import { getLineContentForDisplayWithInfo } from "../script/script.utils";
import BlockingScriptStrip from "./blocking-script-strip.component";
import BlockingTimeline from "./blocking-timeline.component";
import BlockingStageViewer from "./blocking-stage-viewer.component";
import { buildInitialTracks, timelineDurationMs, visibleWindowMs } from "./blocking-timeline.lib";
import { CUE_KIND_ORDER, type CueKind } from "./blocking.models";
import { PRELOAD_MS, TIMELINE_PX_PER_MS } from "./blocking.config";
import styles from "./blocking-tab.module.css";

/**
 * Blocking tab (wireframe v3, issue #215): top to bottom — script strip
 * (speaker name above, single full-width line, inline play/stop/jump),
 * multi-track canvas timeline, stage viewer canvas.
 */
function BlockingTab() {
  const { t } = useTranslation("blocking");
  const scriptContext = useScriptContext();
  const [playheadMs, setPlayheadMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [viewWindow, setViewWindow] = useState({ startMs: 0, endMs: PRELOAD_MS * 2 });
  const lineScrollRef = useRef<HTMLDivElement>(null);
  const tracksScrollRef = useRef<HTMLDivElement>(null);

  // keep the script strip and the timeline on the same horizontal position,
  // and derive the visible time window (used to render only what's near)
  const updateWindowFromScroll = (scrollLeft: number, clientWidth: number, total: number) => {
    setViewWindow((prev) => {
      const next = visibleWindowMs(scrollLeft, clientWidth, total, PRELOAD_MS);
      // round to limit re-renders while scrolling
      const rStart = Math.round(next.startMs / 250);
      const rEnd = Math.round(next.endMs / 250);
      if (rStart === Math.round(prev.startMs / 250) && rEnd === Math.round(prev.endMs / 250)) {
        return prev;
      }
      return { startMs: rStart * 250, endMs: rEnd * 250 };
    });
  };
  const syncScroll = (source: HTMLDivElement | null, target: HTMLDivElement | null) => {
    if (source && target && source.scrollLeft !== target.scrollLeft) {
      target.scrollLeft = source.scrollLeft;
    }
  };

  const trackLabels = useMemo(
    () =>
      CUE_KIND_ORDER.reduce(
        (acc, kind) => ({ ...acc, [kind]: t(`tracks.${kind}`) }),
        {} as Record<CueKind, string>,
      ),
    [t],
  );

  const lines = useMemo(
    () =>
      scriptContext.linesOrder
        .map((id) => scriptContext.lines.get(id))
        .filter((line) => Boolean(line))
        .map((line) => {
          const [content] = getLineContentForDisplayWithInfo(
            line,
            scriptContext.lineContents,
            scriptContext.lineToContents,
          );
          return {
            id: line.id,
            type: line.type,
            text: content.text,
            characters: line.type === "chartext" ? content.characters : undefined,
            deleted: content.deleted,
          };
        })
        .filter((line) => !line.deleted),
    [
      scriptContext.linesOrder,
      scriptContext.lines,
      scriptContext.lineContents,
      scriptContext.lineToContents,
    ],
  );

  const [tracks, setTracks] = useState(() => buildInitialTracks(lines, trackLabels));
  const totalMs = timelineDurationMs(tracks);

  // per-line start/duration on the audio track, for the one-line strip
  const stripLines = useMemo(() => {
    const audioTrack = tracks.find((track) => track.kind === "lineAudio");
    const cueByLine = new Map(
      (audioTrack?.cues ?? []).map((cue) => [cue.data?.lineId as string, cue]),
    );
    return lines
      .filter((line) => cueByLine.has(line.id))
      .map((line) => {
        const cue = cueByLine.get(line.id)!;
        const speakerId = line.characters?.[0];
        return {
          id: line.id,
          text: line.text,
          speaker: speakerId ? (scriptContext.characters[speakerId] ?? null) : null,
          startMs: cue.startMs,
          durationMs: cue.durationMs,
        };
      });
  }, [tracks, lines, scriptContext.characters]);

  // current line = the lineAudio cue containing the playhead
  const currentCue = useMemo(() => {
    const audioTrack = tracks.find((track) => track.kind === "lineAudio");
    return audioTrack?.cues.find(
      (cue) => playheadMs >= cue.startMs && playheadMs < cue.startMs + cue.durationMs,
    );
  }, [tracks, playheadMs]);
  const currentLineId = currentCue?.data?.lineId as string | undefined;

  // playback clock: advance the playhead in real time while playing
  useEffect(() => {
    if (!playing) return;
    let last = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const dt = now - last;
      last = now;
      setPlayheadMs((prev) => Math.min(prev + dt, totalMs));
    }, 50);
    return () => clearInterval(interval);
  }, [playing, totalMs]);

  // stop at the end of the timeline
  useEffect(() => {
    if (totalMs > 0 && playheadMs >= totalMs) setPlaying(false);
  }, [playheadMs, totalMs]);

  // keep the playhead visible in both scrollers while playing
  useEffect(() => {
    if (!playing) return;
    const x = playheadMs * TIMELINE_PX_PER_MS;
    for (const el of [tracksScrollRef.current, lineScrollRef.current]) {
      if (!el) continue;
      const viewLeft = el.scrollLeft;
      const viewRight = el.scrollLeft + el.clientWidth;
      if (x < viewLeft + 40) el.scrollLeft = Math.max(0, x - 40);
      else if (x > viewRight - 80) el.scrollLeft = x - el.clientWidth + 80;
    }
  }, [playing, playheadMs]);

  const handlePlayPause = () => {
    if (!playing && playheadMs >= totalMs) setPlayheadMs(0);
    setPlaying((prev) => !prev);
  };
  const handleStop = () => {
    setPlaying(false);
    setPlayheadMs(0);
  };
  const handleJumpToLine = () => {
    if (currentCue) setPlayheadMs(currentCue.startMs);
  };
  const handleToggleTrack = (trackId: string) => {
    setTracks((prev) =>
      prev.map((track) =>
        track.id === trackId ? { ...track, collapsed: !track.collapsed } : track,
      ),
    );
  };

  const stageElements = useMemo(
    () =>
      Object.entries(scriptContext.characters).map(([id, name], index) => ({
        id,
        label: name,
        x: 0.2 + 0.6 * ((index * 0.37) % 1),
        y: 0.3 + 0.4 * ((index * 0.61) % 1),
      })),
    [scriptContext.characters],
  );

  return (
    <div className={styles.container}>
      <div className={styles.stripSection}>
        <BlockingScriptStrip
          ref={lineScrollRef}
          lines={stripLines}
          currentLineId={currentLineId ?? null}
          windowStartMs={viewWindow.startMs}
          windowEndMs={viewWindow.endMs}
          playing={playing}
          onPlayPause={handlePlayPause}
          onStop={handleStop}
          onJumpToLine={handleJumpToLine}
          onLineScroll={(left, width) => {
            syncScroll(lineScrollRef.current, tracksScrollRef.current);
            updateWindowFromScroll(left, width, totalMs);
          }}
        />
      </div>
      <div className={styles.timelineSection}>
        <BlockingTimeline
          tracks={tracks}
          playheadMs={playheadMs}
          windowStartMs={viewWindow.startMs}
          windowEndMs={viewWindow.endMs}
          onToggleTrack={handleToggleTrack}
          scrollRef={tracksScrollRef}
          onScroll={(left, width) => {
            syncScroll(tracksScrollRef.current, lineScrollRef.current);
            updateWindowFromScroll(left, width, totalMs);
          }}
        />
      </div>
      <div className={styles.stageSection}>
        <BlockingStageViewer elements={stageElements} />
      </div>
    </div>
  );
}

export default BlockingTab;
