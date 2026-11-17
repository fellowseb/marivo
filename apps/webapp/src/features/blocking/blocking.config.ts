/** Timeline editing grid in ms — cues snap to it unless the user holds the bypass key. */
export const TIMELINE_GRID_MS = 500;

/** Horizontal scale of the timeline canvas: pixels per millisecond (50 px/s). */
export const TIMELINE_PX_PER_MS = 0.05;

/**
 * Rendering window: only cues/lines intersecting the visible time range
 * (expanded by this preload margin on both sides) are rendered.
 */
export const PRELOAD_MS = 5000;

/** Max canvas backing width in px (browser canvas limit guard). */
export const MAX_CANVAS_WIDTH_PX = 4096;

/** Default speech rate used to estimate line durations before audio exists (see #209). */
export const DEFAULT_WPM = 140;

/** Max height of the vertical-scrollable track list, in px. */
