import type { StagePlanState } from "./blocking.models.ts";

/**
 * Pure helpers to adapt a stage plan to a new stage size: every millimeter
 * coordinate is rescaled (fx = newWidth/oldWidth, fy = newHeight/oldHeight),
 * rounded to integers. Used by duplicateStagePlan (#208).
 */

export interface NewDimensionsMm {
  width: number;
  height: number;
}

/**
 * Recursively rescale any `xMm`/`yMm` (position) and `widthMm`/`heightMm`
 * (extent) numeric fields found in the value. Everything else (rotationDeg,
 * colors, ids, …) is left untouched.
 */
export function rescaleMmFields(value: unknown, fx: number, fy: number): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => rescaleMmFields(item, fx, fy));
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (typeof v === "number") {
        if (key === "xMm" || key === "widthMm") {
          out[key] = Math.round(v * fx);
          continue;
        }
        if (key === "yMm" || key === "heightMm") {
          out[key] = Math.round(v * fy);
          continue;
        }
      }
      out[key] = rescaleMmFields(v, fx, fy);
    }
    return out;
  }
  return value;
}

export interface RescaledState {
  state: StagePlanState;
  /** ids of elements whose origin lands outside the new stage */
  outOfBoundsElementIds: string[];
}

/**
 * Returns a copy of `state` adapted to `newDims`. The caller is responsible for
 * swapping `collectionStagePlanId` / background if a new library plan is chosen.
 */
export function rescaleStagePlanState(
  state: StagePlanState,
  newDims: NewDimensionsMm,
): RescaledState {
  const old = state.plan.dimensionsMm;
  const fx = newDims.width / old.width;
  const fy = newDims.height / old.height;
  const rescaled = rescaleMmFields(state, fx, fy) as StagePlanState;
  rescaled.plan.dimensionsMm = { width: newDims.width, height: newDims.height };
  const outOfBoundsElementIds = rescaled.elements
    .filter((el) => el.xMm < 0 || el.yMm < 0 || el.xMm > newDims.width || el.yMm > newDims.height)
    .map((el) => el.id);
  return { state: rescaled, outOfBoundsElementIds };
}

/** Rescale the mm coordinates inside a cue's `data` (targetPos, motion points). */
export function rescaleCueData(data: unknown, fx: number, fy: number): unknown {
  return rescaleMmFields(data, fx, fy);
}
