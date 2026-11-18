import { describe, it, expect } from "vitest";
import type { StagePlanState } from "./blocking.models.ts";
import {
  rescaleCueData,
  rescaleMmFields,
  rescaleStagePlanState,
} from "./stage-plan-rescale.lib.ts";

const baseState: StagePlanState = {
  schemaVersion: 1,
  plan: {
    libraryPlanId: "builtin:proscenium-12000x8000",
    name: "Proscenium 12x8 m",
    dimensionsMm: { width: 12000, height: 8000 },
    background: {
      locked: true,
      elements: [
        {
          id: "bg-wall",
          semantics: { type: "wall" },
          geometry: { kind: "rect", xMm: 0, yMm: 0, widthMm: 12000, heightMm: 400 },
        },
      ],
    },
  },
  elements: [
    {
      id: "c1",
      kind: "character",
      refId: "c1",
      label: "DORANTE",
      xMm: 6000,
      yMm: 4000,
      rotationDeg: 90,
      layer: "characters",
    },
    {
      id: "p1",
      kind: "prop",
      refId: "table",
      label: "Table",
      xMm: 12000,
      yMm: 8000,
      widthMm: 2000,
      heightMm: 1000,
      layer: "props",
    },
  ],
};

describe("rescaleMmFields", () => {
  it("scales xMm/widthMm by fx and yMm/heightMm by fy, rounding to integers", () => {
    const out = rescaleMmFields(
      { xMm: 6001, yMm: 4000, widthMm: 2001, heightMm: 999, rotationDeg: 90 },
      0.5,
      2,
    );
    expect(out).toEqual({ xMm: 3001, yMm: 8000, widthMm: 1001, heightMm: 1998, rotationDeg: 90 });
  });

  it("recurses into nested objects and arrays", () => {
    const out = rescaleMmFields(
      { motion: { c1: { xMm: 1000, yMm: 2000 } }, points: [{ xMm: 3000, yMm: 4000 }] },
      2,
      0.5,
    );
    expect(out).toEqual({
      motion: { c1: { xMm: 2000, yMm: 1000 } },
      points: [{ xMm: 6000, yMm: 2000 }],
    });
  });
});

describe("rescaleStagePlanState", () => {
  it("rescales elements and background geometry and replaces dimensionsMm", () => {
    // 12000x8000 -> 6000x4000: fx = 0.5, fy = 0.5
    const { state, outOfBoundsElementIds } = rescaleStagePlanState(baseState, {
      width: 6000,
      height: 4000,
    });
    expect(state.plan.dimensionsMm).toEqual({ width: 6000, height: 4000 });
    expect(state.plan.background.elements[0].geometry).toEqual({
      kind: "rect",
      xMm: 0,
      yMm: 0,
      widthMm: 6000,
      heightMm: 200,
    });
    const c1 = state.elements.find((e) => e.id === "c1")!;
    expect(c1.xMm).toBe(3000);
    expect(c1.yMm).toBe(2000);
    expect(c1.rotationDeg).toBe(90); // untouched
    const p1 = state.elements.find((e) => e.id === "p1")!;
    expect(p1.xMm).toBe(6000);
    expect(p1.yMm).toBe(4000);
    expect(p1.widthMm).toBe(1000);
    expect(outOfBoundsElementIds).toEqual([]);
  });

  it("flags elements that land outside the new stage (safety net for already-OOB data)", () => {
    const state: StagePlanState = {
      ...baseState,
      elements: [{ ...baseState.elements[0], id: "c-oob", xMm: 13000, yMm: 100 }],
    };
    // old width 12000, element already beyond it; new width 6000 -> 13000*0.5 = 6500 > 6000
    const { outOfBoundsElementIds } = rescaleStagePlanState(state, { width: 6000, height: 4000 });
    expect(outOfBoundsElementIds).toEqual(["c-oob"]);
  });

  it("keeps in-bounds elements unflagged under proportional scaling", () => {
    const { outOfBoundsElementIds } = rescaleStagePlanState(baseState, {
      width: 6000,
      height: 4000,
    });
    // c1 at (6000,4000) -> (3000,2000) inside 6000x4000; p1 corner (12000,8000) -> (6000,4000) inside
    expect(outOfBoundsElementIds).toEqual([]);
  });
});

describe("rescaleCueData", () => {
  it("rescales targetPos and bezier control points", () => {
    const data = {
      elementId: "c1",
      targetPos: { xMm: 9000, yMm: 3000, rotationDeg: 90 },
      motion: {
        type: "bezierPath",
        c1: { xMm: 5000, yMm: 1000 },
        c2: { xMm: 8000, yMm: 5500 },
      },
    };
    const out = rescaleCueData(data, 0.5, 2) as typeof data;
    expect(out.targetPos).toEqual({ xMm: 4500, yMm: 6000, rotationDeg: 90 });
    expect(out.motion.c1).toEqual({ xMm: 2500, yMm: 2000 });
    expect(out.motion.c2).toEqual({ xMm: 4000, yMm: 11000 });
    expect(out.elementId).toBe("c1");
  });
});
