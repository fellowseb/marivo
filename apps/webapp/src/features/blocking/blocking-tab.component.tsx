import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useScriptContext } from "../script/script.context";
import { getLineContentForDisplayWithInfo } from "../script/script.utils";
import BlockingScriptStrip from "./blocking-script-strip.component";
import BlockingTimeline from "./blocking-timeline.component";
import BlockingStageViewer from "./blocking-stage-viewer.component";
import { buildInitialTracks, timelineDurationMs } from "./blocking-timeline.lib";
import { CUE_KIND_ORDER, type CueKind } from "./blocking.models";
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
  const lineScrollRef = useRef<HTMLDivElement>(null);
  const tracksScrollRef = useRef<HTMLDivElement>(null);

  // keep the script strip and the timeline on the same horizontal position
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

  // current line = the lineAudio cue containing the playhead
  const currentCue = useMemo(() => {
    const audioTrack = tracks.find((track) => track.kind === "lineAudio");
    return audioTrack?.cues.find(
      (cue) => playheadMs >= cue.startMs && playheadMs < cue.startMs + cue.durationMs,
    );
  }, [tracks, playheadMs]);
  const currentLineId = currentCue?.data?.lineId as string | undefined;
  const currentLineRaw = currentLineId ? scriptContext.lines.get(currentLineId) : undefined;
  const currentContent = currentLineRaw
    ? getLineContentForDisplayWithInfo(
        currentLineRaw,
        scriptContext.lineContents,
        scriptContext.lineToContents,
      )[0]
    : null;
  const speakerId =
    currentLineRaw?.type === "chartext" && currentContent?.characters[0]
      ? currentContent.characters[0]
      : null;
  const speaker = speakerId ? scriptContext.characters[speakerId] : null;

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
          speaker={speaker}
          lineText={currentContent?.text ?? ""}
          playing={playing}
          onPlayPause={handlePlayPause}
          onStop={handleStop}
          onJumpToLine={handleJumpToLine}
          onLineScroll={() => syncScroll(lineScrollRef.current, tracksScrollRef.current)}
        />
      </div>
      <div className={styles.timelineSection}>
        <BlockingTimeline
          tracks={tracks}
          playheadMs={playheadMs}
          onToggleTrack={handleToggleTrack}
          scrollRef={tracksScrollRef}
          onScroll={() => syncScroll(tracksScrollRef.current, lineScrollRef.current)}
        />
      </div>
      <div className={styles.stageSection}>
        <BlockingStageViewer elements={stageElements} />
      </div>
    </div>
  );
}

export default BlockingTab;
