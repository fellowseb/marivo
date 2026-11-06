import { Result } from "@marivo/utils";
import { UserRepositoryBase } from "../../shared/user-repository-base.ts";
import { Record } from "../../shared/record.ts";
import { AppError, InternalServerError } from "../../shared/error.ts";

export class CollectionPlayNotFound extends AppError {
  constructor() {
    super("Collection play not found", "NOT_FOUND");
  }
}

export class PlayAlreadyInCollection extends AppError {
  constructor() {
    super("This play's script is already in the collection", "BAD_REQUEST");
  }
}

interface TheatricalGenreRecordValues {
  key: string;
}

class TheatricalGenreRecord extends Record<TheatricalGenreRecordValues> {}

interface TheatricalPeriodRecordValues {
  key: string;
}

class TheatricalPeriodRecord extends Record<TheatricalPeriodRecordValues> {}

interface PublicDomainPlayRecordValues {
  uri: string;
  title: string;
  author: string;
  lang: string;
  number_of_roles: number | null;
  number_of_male_roles: number | null;
  number_of_female_roles: number | null;
  genre: string | null;
  period: string | null;
  synopsis: string | null;
  number_of_words: number;
  characters: { [id: string]: string };
  bookmarked: boolean;
  archived: boolean;
}

export interface CollectionFilters {
  title?: string;
  author?: string;
  languages?: string[];
  genres?: string[];
  periods?: string[];
  minRoles?: number;
  maxRoles?: number;
  minMaleRoles?: number;
  maxMaleRoles?: number;
  minFemaleRoles?: number;
  maxFemaleRoles?: number;
  bookmarkedOnly?: boolean;
  /** Only archived plays; requires includeArchived (capability-gated by the use case). */
  archivedOnly?: boolean;
}

export interface CollectionPage {
  filters: CollectionFilters;
  page: number;
  pageSize: number;
  /** Whether archived plays may be listed at all (capability-gated). */
  includeArchived: boolean;
}

export class PublicDomainPlayRecord extends Record<PublicDomainPlayRecordValues> {}

export interface CollectionPlayDetails {
  uri: string;
  title: string;
  author: string;
  lang: string;
  numberOfRoles: number | null;
  numberOfMaleRoles: number | null;
  numberOfFemaleRoles: number | null;
  genre: string | null;
  period: string | null;
  synopsis: string | null;
  archived: boolean;
}

export class PlaysCollectionRepository extends UserRepositoryBase {
  async findAllGenres(): Promise<Result<TheatricalGenreRecord[], InternalServerError>> {
    const genreRecords = await this.sql<TheatricalGenreRecordValues[]>`
      SELECT key FROM theatrical_genres ORDER BY key;
    `;
    return Result.ok(genreRecords.map((values) => new TheatricalGenreRecord(values)));
  }
  async findAllPeriods(): Promise<Result<TheatricalPeriodRecord[], InternalServerError>> {
    const genreRecords = await this.sql<TheatricalPeriodRecordValues[]>`
      SELECT key FROM theatrical_periods ORDER BY key;
    `;
    return Result.ok(genreRecords.map((values) => new TheatricalPeriodRecord(values)));
  }
  async countAll(): Promise<Result<number, InternalServerError>> {
    const countRecords = await this.sql<{ count: string }[]>`
      SELECT COUNT(DISTINCT id) FROM public_domain_plays;
    `;
    const record = countRecords[0];
    if (!record) {
      return Result.failure(new InternalServerError("Failed to countAll collection plays"));
    }
    return Result.ok(Number.parseInt(record.count));
  }

  /** Filtered, paginated collection plays with metadata, characters, word count and bookmark flag. */
  async findAllScripts(
    params: CollectionPage,
  ): Promise<Result<{ records: PublicDomainPlayRecord[]; total: number }, InternalServerError>> {
    const { filters, page, pageSize, includeArchived } = params;
    const conditions = [];
    if (!includeArchived) {
      conditions.push(this.sql`p.archived = false`);
    } else if (filters.archivedOnly) {
      conditions.push(this.sql`p.archived = true`);
    }
    if (filters.title) {
      conditions.push(this.sql`p.title ILIKE ${"%" + filters.title + "%"}`);
    }
    if (filters.author) {
      conditions.push(this.sql`p.author ILIKE ${"%" + filters.author + "%"}`);
    }
    if (filters.languages?.length) {
      conditions.push(this.sql`p.lang = ANY(${filters.languages})`);
    }
    if (filters.genres?.length) {
      conditions.push(this.sql`p.genre = ANY(${filters.genres})`);
    }
    if (filters.periods?.length) {
      conditions.push(this.sql`p.period = ANY(${filters.periods})`);
    }
    if (filters.minRoles !== undefined) {
      conditions.push(this.sql`p.number_of_roles >= ${filters.minRoles}`);
    }
    if (filters.maxRoles !== undefined) {
      conditions.push(this.sql`p.number_of_roles <= ${filters.maxRoles}`);
    }
    if (filters.minMaleRoles !== undefined) {
      conditions.push(this.sql`p.number_of_male_roles >= ${filters.minMaleRoles}`);
    }
    if (filters.maxMaleRoles !== undefined) {
      conditions.push(this.sql`p.number_of_male_roles <= ${filters.maxMaleRoles}`);
    }
    if (filters.minFemaleRoles !== undefined) {
      conditions.push(this.sql`p.number_of_female_roles >= ${filters.minFemaleRoles}`);
    }
    if (filters.maxFemaleRoles !== undefined) {
      conditions.push(this.sql`p.number_of_female_roles <= ${filters.maxFemaleRoles}`);
    }
    if (filters.bookmarkedOnly) {
      conditions.push(
        this.sql`EXISTS (
          SELECT 1 FROM collection_bookmarks b
          WHERE b.play_uri = p.uri AND b.user_id = ${this.userId()}
        )`,
      );
    }
    const where = conditions.length
      ? this.sql`WHERE ${conditions.reduce((acc, c) => this.sql`${acc} AND ${c}`)}`
      : this.sql``;

    const [countRow] = await this.sql<{ total: number }[]>`
      SELECT COUNT(*)::int AS total
      FROM public_domain_plays p
      ${where};
    `;
    const records = await this.sql<PublicDomainPlayRecordValues[]>`
      SELECT p.uri,
             p.title,
             p.author,
             p.lang,
             p.number_of_roles,
             p.number_of_male_roles,
             p.number_of_female_roles,
             p.genre,
             p.period,
             p.synopsis,
             COALESCE(
               (
                 SELECT SUM(array_length(string_to_array(lc.text, ' '), 1))::int
                 FROM lines_contents lc
                 WHERE lc.script_id = p.script_id
                   AND lc.type = 'saved_version'
               ),
               0
             ) AS number_of_words,
             s.characters,
             (b.play_uri IS NOT NULL) AS bookmarked,
             p.archived
      FROM public_domain_plays p
      JOIN scripts s ON s.id = p.script_id
      LEFT JOIN collection_bookmarks b ON b.play_uri = p.uri AND b.user_id = ${this.userId()}
      ${where}
      ORDER BY p.author COLLATE "C", p.title COLLATE "C"
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize};
    `;
    return Result.ok({
      records: records.map((values) => new PublicDomainPlayRecord(values)),
      total: countRow?.total ?? 0,
    });
  }

  /** Toggle the current user's bookmark on a collection play; returns the new state. */
  async toggleBookmark(params: {
    playUri: string;
  }): Promise<Result<{ bookmarked: boolean }, CollectionPlayNotFound | InternalServerError>> {
    const play = await this.getScriptIdByUri({ uri: params.playUri });
    if (play.isFailure()) {
      return Result.failure(play.errorOrThrow());
    }
    const inserted = await this.sql<{ play_uri: string }[]>`
      INSERT INTO collection_bookmarks (user_id, play_uri)
      VALUES (${this.userId()}, ${params.playUri})
      ON CONFLICT (user_id, play_uri) DO NOTHING
      RETURNING play_uri;
    `;
    if (inserted.length > 0) {
      return Result.ok({ bookmarked: true });
    }
    await this.sql`
      DELETE FROM collection_bookmarks
      WHERE user_id = ${this.userId()} AND play_uri = ${params.playUri};
    `;
    return Result.ok({ bookmarked: false });
  }

  /** Full details of a collection play (used e.g. for page titles and the settings page). */
  async findByUri(params: {
    uri: string;
  }): Promise<Result<CollectionPlayDetails, CollectionPlayNotFound | InternalServerError>> {
    const records = await this.sql<
      {
        uri: string;
        title: string;
        author: string;
        lang: string;
        number_of_roles: number | null;
        number_of_male_roles: number | null;
        number_of_female_roles: number | null;
        genre: string | null;
        period: string | null;
        synopsis: string | null;
        archived: boolean;
      }[]
    >`
      SELECT uri, title, author, lang,
             number_of_roles, number_of_male_roles, number_of_female_roles,
             genre, period, synopsis, archived
      FROM public_domain_plays WHERE uri = ${params.uri};
    `;
    const record = records[0];
    if (!record) {
      return Result.failure(new CollectionPlayNotFound());
    }
    return Result.ok({
      uri: record.uri,
      title: record.title,
      author: record.author,
      lang: record.lang,
      numberOfRoles: record.number_of_roles,
      numberOfMaleRoles: record.number_of_male_roles,
      numberOfFemaleRoles: record.number_of_female_roles,
      genre: record.genre,
      period: record.period,
      synopsis: record.synopsis,
      archived: record.archived,
    });
  }

  /** Update the metadata of a collection play. */
  async updateMetadata(params: {
    uri: string;
    title: string;
    author: string;
    lang: string;
    numberOfRoles?: number | undefined;
    numberOfMaleRoles?: number | undefined;
    numberOfFemaleRoles?: number | undefined;
    genre?: string | undefined;
    period?: string | undefined;
    synopsis?: string | undefined;
  }): Promise<Result<undefined, CollectionPlayNotFound | InternalServerError>> {
    const result = await this.sql<{ uri: string }[]>`
      UPDATE public_domain_plays SET
        title = ${params.title},
        author = ${params.author},
        lang = ${params.lang},
        number_of_roles = ${params.numberOfRoles ?? null},
        number_of_male_roles = ${params.numberOfMaleRoles ?? null},
        number_of_female_roles = ${params.numberOfFemaleRoles ?? null},
        genre = ${params.genre ?? null},
        period = ${params.period ?? null},
        synopsis = ${params.synopsis ?? null}
      WHERE uri = ${params.uri}
      RETURNING uri;
    `;
    if (result.length === 0) {
      return Result.failure(new CollectionPlayNotFound());
    }
    return Result.ok(undefined);
  }

  /** Archive or unarchive a collection play. */
  async setArchived(params: {
    uri: string;
    archived: boolean;
  }): Promise<Result<undefined, CollectionPlayNotFound | InternalServerError>> {
    const result = await this.sql<{ uri: string }[]>`
      UPDATE public_domain_plays SET archived = ${params.archived}
      WHERE uri = ${params.uri}
      RETURNING uri;
    `;
    if (result.length === 0) {
      return Result.failure(new CollectionPlayNotFound());
    }
    return Result.ok(undefined);
  }

  /** Delete a collection play (its script is left untouched). */
  async deleteByUri(params: {
    uri: string;
  }): Promise<Result<undefined, CollectionPlayNotFound | InternalServerError>> {
    const result = await this.sql<{ uri: string }[]>`
      DELETE FROM public_domain_plays WHERE uri = ${params.uri}
      RETURNING uri;
    `;
    if (result.length === 0) {
      return Result.failure(new CollectionPlayNotFound());
    }
    return Result.ok(undefined);
  }

  async getScriptIdByUri(params: { uri: string }): Promise<Result<number, CollectionPlayNotFound>> {
    const records = await this.sql<{ script_id: number }[]>`
      SELECT script_id FROM public_domain_plays WHERE uri = ${params.uri};
    `;
    const record = records[0];
    if (!record) {
      return Result.failure(new CollectionPlayNotFound());
    }
    return Result.ok(record.script_id);
  }

  /** Whether a script is already published in the collection. */
  async existsByScriptId(scriptId: number): Promise<Result<boolean, InternalServerError>> {
    const records = await this.sql<{ exists: boolean }[]>`
      SELECT EXISTS(SELECT 1 FROM public_domain_plays WHERE script_id = ${scriptId}) AS exists;
    `;
    const record = records[0];
    if (!record) {
      return Result.failure(new InternalServerError("Failed to check existsByScriptId"));
    }
    return Result.ok(record.exists);
  }

  /** Publish a play's script into the public domain collection; returns the new entry uri. */
  async addToCollection(params: {
    uri: string;
    title: string;
    author: string;
    lang: string;
    numberOfRoles?: number | undefined;
    numberOfMaleRoles?: number | undefined;
    numberOfFemaleRoles?: number | undefined;
    genre?: string | undefined;
    period?: string | undefined;
    synopsis?: string | undefined;
    scriptId: number;
  }): Promise<Result<{ uri: string }, InternalServerError>> {
    const records = await this.sql<{ uri: string }[]>`
      INSERT INTO public_domain_plays (
        uri, title, author, lang,
        number_of_roles, number_of_male_roles, number_of_female_roles,
        genre, period, synopsis, archived, script_id
      ) VALUES (
        ${params.uri}, ${params.title}, ${params.author}, ${params.lang},
        ${params.numberOfRoles ?? null}, ${params.numberOfMaleRoles ?? null}, ${params.numberOfFemaleRoles ?? null},
        ${params.genre ?? null}, ${params.period ?? null}, ${params.synopsis ?? null},
        true, ${params.scriptId}
      )
      RETURNING uri;
    `;
    const record = records[0];
    if (!record) {
      return Result.failure(new InternalServerError("Unexpected empty row on addToCollection"));
    }
    return Result.ok({ uri: record.uri });
  }
}
