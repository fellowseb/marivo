# Blocking page — UI layout notes

Layout decisions gathered during wireframe review (see `blocking-page-sketch.png` / `.svg`, v3).
These notes complement the feature's [DEV_PLAN.md](../../apps/webapp/src/features/blocking/DEV_PLAN.md).

## Page layout (top to bottom)

1. **Header** — title tab + menubar (Script / Blocking / Settings / Participants), theme toggle, avatar
2. **Toolbar** — undo / redo / search
3. **Current speaker name** — displayed **above** the script line, e.g. `DORANTE`
4. **Script line** — a **single line, full width**:
   - the réplique currently being spoken, horizontal scrolling synced with playback
   - **play / stop / jump controls inline at its left** (no separate playback panel)
   - no time tracker / slider
5. **Timeline** — placed **between the script line and the stage viewer**, composed of **several tracks**:
   - a track is a **rectangle taking the full width**; tracks are **stacked** vertically
   - each track contains **cues of a specific type and colour** (e.g. Déplacements = blue, Entrées/Sorties = green, Props = orange, Gestes/Regards = purple)
   - shared time ruler and playhead across all tracks
6. **Stage viewer** (not "editor") — the 2D animated plan at the bottom of the page, driven by the timeline tracks

## Explicitly rejected

- Script column on the left of the page (rejected in review — script goes above, in one line)
- Separate bottom playback panel with time tracker / mode selector (rejected — only play, stop and jump, inline with the script line)
