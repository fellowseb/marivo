import { Result } from "@marivo/utils";
import { AppError, InternalServerError } from "../../shared/error.ts";
import { UserRepositoryBase } from "../../shared/user-repository-base.ts";
import {
  CollectionStagePlanMetaSchema,
  StagePlanStateSchema,
  type CollectionStagePlan,
  type CollectionStagePlanMeta,
  type CollectionStagePlanSummary,
  type StagePlanState,
} from "./blocking.models.ts";

export class CollectionStagePlanNotFound extends AppError {
  constructor(id: number) {
    super(`Collection stage plan not found: ${id}`, "NOT_FOUND");
  }
}

export class CollectionStagePlanConflict extends AppError {
  constructor(id: number) {
    super(
      `Collection stage plan ${id} was modified by someone else; reload and retry`,
      "BAD_REQUEST",
    );
  }
}

function parseJsonb(raw: unknown): unknown {
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

interface CollectionStagePlanRow {
  id: number;
  name: string;
  state: unknown;
  version: number;
  is_generic: boolean;
  layout_type: string | null;
  theatre_name: string | null;
  city: string | null;
  country: string | null;
  archived: boolean;
  created_by: number | null;
  last_modified_date: Date;
  created_date: Date;
}

function rowToModel(row: CollectionStagePlanRow): CollectionStagePlan {
  const parsedState = StagePlanStateSchema.safeParse(parseJsonb(row.state));
  if (!parsedState.success) {
    throw new InternalServerError(
      `Stored collection stage plan state is invalid: ${parsedState.error.message}`,
    );
  }
  const meta = CollectionStagePlanMetaSchema.safeParse({
    name: row.name,
    isGeneric: row.is_generic,
    layoutType: row.layout_type,
    theatreName: row.theatre_name,
    city: row.city,
    country: row.country,
  });
  if (!meta.success) {
    throw new InternalServerError(
      `Stored collection stage plan metadata is invalid: ${meta.error.message}`,
    );
  }
  return {
    ...meta.data,
    id: row.id,
    state: parsedState.data,
    version: row.version,
    archived: row.archived,
    createdBy: row.created_by,
    lastModifiedDate: row.last_modified_date,
    createdDate: row.created_date,
  };
}

function rowToSummary(row: CollectionStagePlanRow): CollectionStagePlanSummary {
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    isGeneric: row.is_generic,
    layoutType: (row.layout_type ?? null) as CollectionStagePlanSummary["layoutType"],
    theatreName: row.theatre_name,
    city: row.city,
    country: row.country,
    archived: row.archived,
    createdBy: row.created_by,
    lastModifiedDate: row.last_modified_date,
    createdDate: row.created_date,
  };
}

const COLUMNS = `
  id, name, state, version, is_generic, layout_type, theatre_name, city, country,
  archived, created_by, last_modified_date, created_date
`;

export class CollectionStagePlanRepository extends UserRepositoryBase {
  async list(params: {
    query?: string | undefined;
    genericOnly?: boolean | undefined;
    includeArchived?: boolean | undefined;
  }): Promise<CollectionStagePlanSummary[]> {
    const query = params.query?.trim();
    const rows = await this.sql<CollectionStagePlanRow[]>`
      SELECT ${this.sql.unsafe(COLUMNS)}
      FROM collection_stage_plans
      WHERE (${params.includeArchived ?? false} OR archived = false)
        AND (${params.genericOnly ?? false} = false OR is_generic = true)
        AND (${query === undefined || query === ""} OR name ILIKE ${`%${query ?? ""}%`}
             OR theatre_name ILIKE ${`%${query ?? ""}%`})
      ORDER BY is_generic DESC, name
    `;
    return rows.map(rowToSummary);
  }

  async getById(
    id: number,
    opts?: { includeArchived?: boolean },
  ): Promise<Result<CollectionStagePlan, CollectionStagePlanNotFound>> {
    const rows = await this.sql<CollectionStagePlanRow[]>`
      SELECT ${this.sql.unsafe(COLUMNS)}
      FROM collection_stage_plans
      WHERE id = ${id}
        AND (${opts?.includeArchived ?? false} OR archived = false)
    `;
    const row = rows[0];
    if (!row) return Result.failure(new CollectionStagePlanNotFound(id));
    return Result.ok(rowToModel(row));
  }

  async create(params: {
    meta: CollectionStagePlanMeta;
    state: StagePlanState;
  }): Promise<CollectionStagePlan> {
    const { meta, state } = params;
    const [row] = await this.sql<CollectionStagePlanRow[]>`
      INSERT INTO collection_stage_plans
        (name, state, is_generic, layout_type, theatre_name, city, country, created_by)
      VALUES (
        ${meta.name},
        ${JSON.stringify(state)}::jsonb,
        ${meta.isGeneric},
        ${meta.layoutType ?? null},
        ${meta.theatreName ?? null},
        ${meta.city ?? null},
        ${meta.country ?? null},
        ${this.userId()}
      )
      RETURNING ${this.sql.unsafe(COLUMNS)}
    `;
    if (!row) throw new InternalServerError("Unexpected empty row on collection stage plan create");
    return rowToModel(row);
  }

  /** LWW update on version; metadata fields update only when provided. */
  async update(params: {
    id: number;
    expectedVersion: number;
    meta?:
      | { [K in keyof CollectionStagePlanMeta]?: CollectionStagePlanMeta[K] | undefined }
      | undefined;
    state?: StagePlanState | undefined;
  }): Promise<
    Result<CollectionStagePlan, CollectionStagePlanNotFound | CollectionStagePlanConflict>
  > {
    const { id, expectedVersion, meta, state } = params;
    // undefined = don't touch, null = clear; sql(obj) builds the SET clause
    const set: Record<string, unknown> = {
      version: this.sql`version + 1`,
      last_modified_date: this.sql`now()`,
    };
    if (state !== undefined) set.state = this.sql`${JSON.stringify(state)}::jsonb`;
    if (meta?.name !== undefined) set.name = meta.name;
    if (meta?.isGeneric !== undefined) set.is_generic = meta.isGeneric;
    if (meta?.layoutType !== undefined) set.layout_type = meta.layoutType;
    if (meta?.theatreName !== undefined) set.theatre_name = meta.theatreName;
    if (meta?.city !== undefined) set.city = meta.city;
    if (meta?.country !== undefined) set.country = meta.country;
    const rows = await this.sql<CollectionStagePlanRow[]>`
      UPDATE collection_stage_plans
      SET ${this.sql(set)}
      WHERE id = ${id} AND version = ${expectedVersion} AND archived = false
      RETURNING ${this.sql.unsafe(COLUMNS)}
    `;
    const row = rows[0];
    if (row) return Result.ok(rowToModel(row));

    const [existing] = await this.sql<{ id: number }[]>`
      SELECT id FROM collection_stage_plans WHERE id = ${id} AND archived = false
    `;
    if (!existing) return Result.failure(new CollectionStagePlanNotFound(id));
    return Result.failure(new CollectionStagePlanConflict(id));
  }

  /** soft delete */
  async archive(id: number): Promise<Result<undefined, CollectionStagePlanNotFound>> {
    const rows = await this.sql<{ id: number }[]>`
      UPDATE collection_stage_plans
      SET archived = true, last_modified_date = now()
      WHERE id = ${id} AND archived = false
      RETURNING id
    `;
    if (rows.length === 0) return Result.failure(new CollectionStagePlanNotFound(id));
    return Result.ok(undefined);
  }
}
