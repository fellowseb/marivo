import { Result } from "@marivo/utils";
import { UserRepositoryBase } from "../../shared/user-repository-base.ts";
import { Record } from "../../shared/record.ts";
import { AppError, InternalServerError } from "../../shared/error.ts";

export class CollectionPlayNotFound extends AppError {
  constructor() {
    super("Collection play not found", "NOT_FOUND");
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
}

export class PublicDomainPlayRecord extends Record<PublicDomainPlayRecordValues> {}

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

  /** All collection plays with their metadata, characters and word count. */
  async findAllScripts(): Promise<Result<PublicDomainPlayRecord[], InternalServerError>> {
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
             s.characters
      FROM public_domain_plays p
      JOIN scripts s ON s.id = p.script_id
      ORDER BY p.author COLLATE "C", p.title COLLATE "C";
    `;
    return Result.ok(records.map((values) => new PublicDomainPlayRecord(values)));
  }

  async getScriptIdByUri(params: {
    uri: string;
  }): Promise<Result<number, CollectionPlayNotFound>> {
    const records = await this.sql<{ script_id: number }[]>`
      SELECT script_id FROM public_domain_plays WHERE uri = ${params.uri};
    `;
    const record = records[0];
    if (!record) {
      return Result.failure(new CollectionPlayNotFound());
    }
    return Result.ok(record.script_id);
  }
}
