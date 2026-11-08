/**
 * Blocking domain models. Time unit on the timeline is the **millisecond**.
 */

export type CueKind =
  | "movement" // Déplacements (character/prop movement)
  | "entranceExit" // Entrées/Sorties
  | "prop" // Props
  | "gesture" // Gestes/Regards
  | "lineAudio" // generated line audio (read-only)
  | "lights" // light transitions
  | "envSound"; // environment sounds

export interface Cue {
  id: string;
  trackId: string;
  /** absolute start on the timeline, in ms */
  startMs: number;
  /** duration in ms; edges are resizable */
  durationMs: number;
  kind: CueKind;
  data?: Record<string, unknown>;
  /** lineAudio cues are generated and not editable */
  editable: boolean;
}

export interface Track {
  id: string;
  kind: CueKind;
  label: string;
  color: string;
  collapsed: boolean;
  cues: Cue[];
}

/** One cue type + colour per track (wireframe v3). */
export const CUE_KIND_COLORS: Record<CueKind, string> = {
  movement: "#3b82f6", // blue
  entranceExit: "#22c55e", // green
  prop: "#f97316", // orange
  gesture: "#a855f7", // purple
  lineAudio: "#9ca3af", // gray
  lights: "#eab308", // yellow
  envSound: "#14b8a6", // teal
};

export const CUE_KIND_ORDER: CueKind[] = [
  "lineAudio",
  "movement",
  "entranceExit",
  "prop",
  "gesture",
  "lights",
  "envSound",
];
