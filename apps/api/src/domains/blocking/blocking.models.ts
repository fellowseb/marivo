import z from "zod";

/**
 * Persisted model for a blocking stage plan (floor plan), as agreed on #208.
 * All lengths are integer millimeters; origin = stage top-left, y down.
 */

/** integer millimeters, non-negative (stage origin is top-left) */
const mmInt = z.number().int().nonnegative();

export const PtMmSchema = z.object({
  xMm: mmInt,
  yMm: mmInt,
});

export const StageSemanticsSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("wall") }),
  z.object({
    type: z.literal("door"),
    side: z.enum(["stageLeft", "stageRight", "upstage", "downstage"]).optional(),
    swingDeg: z.number().optional(),
  }),
  z.object({ type: z.literal("window") }),
  z.object({ type: z.literal("curtain"), open: z.boolean().optional() }),
  z.object({ type: z.literal("stairs"), steps: z.number().int().positive().optional() }),
  z.object({ type: z.literal("generic") }),
]);

export const GeometrySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("rect"),
    xMm: mmInt,
    yMm: mmInt,
    widthMm: mmInt,
    heightMm: mmInt,
  }),
  z.object({ kind: z.literal("path"), points: z.array(PtMmSchema) }),
  z.object({
    kind: z.literal("image"),
    srcUri: z.string().min(1),
    xMm: mmInt,
    yMm: mmInt,
    widthMm: mmInt,
    heightMm: mmInt,
  }),
]);

const styleSchema = z.record(z.string(), z.unknown());

export const BackgroundElementSchema = z.object({
  id: z.string().min(1),
  semantics: StageSemanticsSchema,
  geometry: GeometrySchema,
  style: styleSchema.optional(),
});

export const StageElementSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["character", "prop"]),
  /** script character id for characters, prop type for props */
  refId: z.string().optional(),
  label: z.string(),
  /** scene-graph parent; local transform when set (see #208 grouping model) */
  parentId: z.string().nullable().optional(),
  xMm: mmInt,
  yMm: mmInt,
  rotationDeg: z.number().optional(),
  widthMm: mmInt.optional(),
  heightMm: mmInt.optional(),
  color: z.string().optional(),
  locked: z.boolean().optional(),
  layer: z.enum(["background", "props", "characters"]),
  semantics: StageSemanticsSchema.optional(),
  geometry: GeometrySchema.optional(),
  style: styleSchema.optional(),
});

export const StageGroupSchema = z.object({
  id: z.string().min(1),
  elementIds: z.array(z.string().min(1)),
});

export const StagePlanStateSchema = z.object({
  schemaVersion: z.literal(1),
  plan: z.object({
    /** provenance only; the resolved background is inlined (copy-on-write) */
    libraryPlanId: z.string().nullable().optional(),
    name: z.string().max(100),
    dimensionsMm: z.object({ width: mmInt, height: mmInt }),
    background: z.object({
      locked: z.boolean(),
      elements: z.array(BackgroundElementSchema),
    }),
  }),
  /** base/initial placements — what the stage shows at t=0 */
  elements: z.array(StageElementSchema),
  /** persisted only when referenced by a cue */
  groups: z.array(StageGroupSchema).optional(),
});

export type PtMm = z.infer<typeof PtMmSchema>;
export type StageSemantics = z.infer<typeof StageSemanticsSchema>;
export type Geometry = z.infer<typeof GeometrySchema>;
export type BackgroundElement = z.infer<typeof BackgroundElementSchema>;
export type StageElement = z.infer<typeof StageElementSchema>;
export type StageGroup = z.infer<typeof StageGroupSchema>;
export type StagePlanState = z.infer<typeof StagePlanStateSchema>;

export interface StagePlan {
  id: number;
  playId: number;
  name: string;
  state: StagePlanState;
  version: number;
  description: string | null;
  stageLabel: string | null;
  isActive: boolean;
  lastModifiedDate: Date;
  createdDate: Date;
}

export interface StagePlanSummary {
  id: number;
  name: string;
  version: number;
  description: string | null;
  stageLabel: string | null;
  isActive: boolean;
  lastModifiedDate: Date;
  createdDate: Date;
}
