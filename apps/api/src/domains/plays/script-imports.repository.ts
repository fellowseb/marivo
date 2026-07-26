import { Result } from '@marivo/utils';
import { Record as DbRecord } from '../../shared/record.ts';
import { AppError } from '../../shared/error.ts';
import { UserRepositoryBase } from '../../shared/user-repository-base.ts';
import type {
  Files,
  Language,
  ScriptImport,
  ScriptImportForProcessing,
  ScriptImportStatus,
} from './script-imports.models.ts';

export class ScriptImportNotFound extends AppError {
  constructor() {
    super('Script import not found', 'BAD_REQUEST');
  }
}

interface GetScriptImportsRecordValues {
  id: string;
  status: string;
  result_metadata_title: string;
  result_metadata_author: string;
  result_metadata_language: string;
  result_metadata_characters: any[];
  result_metadata_number_of_roles: number;
  result_metadata_number_of_male_roles: number;
  result_metadata_number_of_female_roles: number;
  result_metadata_genre?: string | undefined;
  result_metadata_period?: string | undefined;
  result_metadata_suggestions?: Record<string, string> | undefined;
}

export class GetScriptImportsRecord extends DbRecord<GetScriptImportsRecordValues> {
  toModel(): ScriptImport {
    const status = this.get('status') as ScriptImportStatus;
    return status === 'reviewing'
      ? {
          id: this.get('id'),
          status,
          metadata: {
            title: this.get('result_metadata_title'),
            author: this.get('result_metadata_author'),
            language: this.get('result_metadata_language'),
            characters: this.get('result_metadata_characters'),
            number_of_roles: this.get('result_metadata_number_of_roles'),
            number_of_male_roles: this.get(
              'result_metadata_number_of_male_roles',
            ),
            number_of_female_roles: this.get(
              'result_metadata_number_of_female_roles',
            ),
            genre: this.get('result_metadata_genre') ?? undefined,
            period: this.get('result_metadata_period') ?? undefined,
            suggestions: this.get('result_metadata_suggestions') ?? undefined,
          },
        }
      : {
          id: this.get('id'),
          status,
        };
  }
}

interface GetScriptImportFilesForProcessingRecordValues {
  files: any;
}

export class GetScriptImportFilesForProcessingRecord extends DbRecord<GetScriptImportFilesForProcessingRecordValues> {
  toModel(): ScriptImportForProcessing {
    return {
      files: this.get('files'),
    };
  }
}

type ScriptImportFile =
  | {
      id: string;
      type: 'url';
      url: string;
    }
  | {
      id: string;
      type: 'file';
      name: string;
      size: number;
    };

export class ScriptImportsRepository extends UserRepositoryBase {
  async initImport(params: {
    importId: string;
    files: ScriptImportFile[];
  }): Promise<undefined> {
    await this.clearImport({ id: params.importId });
    const files: Files = params.files.reduce((acc, file, i) => {
      if (file.type === 'file') {
        return {
          ...acc,
          [file.id]: {
            order: i,
            type: file.type,
            name: file.name,
            size: file.size,
            status: 'waiting',
          },
        };
      }
      return {
        ...acc,
        [file.id]: {
          type: file.type,
          url: file.url,
          size: undefined,
          status: 'waiting',
        },
      };
    }, {} as Files);
    await this.sql`
      INSERT INTO script_imports (
        id,
        status,
        files,
        user_id
      ) VALUES (
          ${params.importId},
          'uploading_files',
          ${this.sql.json(files)},
          ${this.userId()}
      );
`;
  }

  async fileUploaded(params: {
    importId: string;
    fileId: string;
  }): Promise<{ readyToProcess: boolean }> {
    const [record] = await this.sql<{ files: Files }[]>`
        SELECT
          files
        FROM script_imports
        WHERE (
          user_id = ${this.userId()}
        ) AND (
          id = ${params.importId}
        ) FOR UPDATE;
    `;
    if (!record) {
      throw new Error('Unexpected importId not found on file uploaded');
    }
    const { files } = record;
    const fileInfo = files[params.fileId];
    if (!fileInfo) {
      throw new Error('Attempt to upload unknown file id ' + params.fileId);
    }
    const filesUpdated = {
      ...files,
      [params.fileId]: {
        ...fileInfo,
        status: 'ready',
      },
    };
    const readyToProcess = Object.values(filesUpdated).every(
      ({ status }) => status === 'ready',
    );
    await this.sql`
      UPDATE script_imports
        SET status = ${readyToProcess ? 'processing_files' : 'uploading_files'},
            files = ${this.sql.json(filesUpdated)}
        WHERE id = ${params.importId} AND user_id = ${this.userId()};
      `;
    return { readyToProcess };
  }

  async fileFetched(params: {
    importId: string;
    fileId: string;
  }): Promise<{ readyToProcess: boolean }> {
    const records = await this.sql<{ files: Files }[]>`
        SELECT FOR UPDATE
          files
        FROM script_imports
        WHERE (
          user_id = ${this.userId()}
        );
    `;
    const record = records[0];
    if (!record) {
      throw new Error('Unexpected importId not found on file uploaded');
    }
    const { files } = record;
    const fileInfo = files[params.fileId];
    if (!fileInfo) {
      throw new Error('Attempt to fetch unknown file id');
    }
    const filesUpdated = {
      ...files,
      [params.fileId]: {
        ...fileInfo,
        status: 'ready',
      },
    };
    const readyToProcess = Object.values(filesUpdated).every(
      ({ status }) => status === 'ready',
    );
    await this.sql`
      UPDATE script_imports
        SET status = ${readyToProcess ? 'processing_files' : 'uploading_files'}
          AND files = ${this.sql.json(files)}
        WHERE id = ${params.importId} AND user_id = ${this.userId()};
      `;
    return { readyToProcess };
  }

  async clearImport(params: { id: string }) {
    await this.sql<{}[]>`
        DELETE
        FROM script_imports
        WHERE id = ${params.id} AND user_id = ${this.userId()};
    `;
  }

  async getScriptImports(): Promise<ScriptImport[]> {
    return (
      await this.sql<GetScriptImportsRecordValues[]>`
        SELECT
          id,
          status,
          result_metadata_title,
          result_metadata_author,
          result_metadata_language,
          result_metadata_characters,
          result_metadata_number_of_roles,
          result_metadata_number_of_male_roles,
          result_metadata_number_of_female_roles,
          result_metadata_genre,
          result_metadata_period,
          result_metadata_suggestions
        FROM script_imports
        WHERE (
          user_id = ${this.userId()}
        );
    `
    ).map((record) => new GetScriptImportsRecord(record).toModel());
  }

  async getScriptImportFilesForProcessing(
    importId: string,
  ): Promise<Result<ScriptImportForProcessing, ScriptImportNotFound>> {
    const records = await this.sql<
      GetScriptImportFilesForProcessingRecordValues[]
    >`
        SELECT
          files
        FROM script_imports
        WHERE (
          id = ${importId}
        ) AND (
          user_id = ${this.userId()}
        );
    `;
    const record = records[0];
    if (!record) {
      return Result.failure(new ScriptImportNotFound());
    }
    return Result.ok(
      new GetScriptImportFilesForProcessingRecord(record).toModel(),
    );
  }

  async getScriptImportStatus(
    id: string,
  ): Promise<Result<ScriptImport, ScriptImportNotFound>> {
    const [record] = await this.sql<GetScriptImportsRecordValues[]>`
        SELECT
          id,
          status,
          result_metadata_title,
          result_metadata_author,
          result_metadata_language,
          result_metadata_characters,
          result_metadata_number_of_roles,
          result_metadata_number_of_male_roles,
          result_metadata_number_of_female_roles,
          result_metadata_genre,
          result_metadata_period,
          result_metadata_suggestions
        FROM script_imports
        WHERE
          id = ${id};
    `;
    if (!record) {
      return Result.failure(new ScriptImportNotFound());
    }
    return Result.ok(new GetScriptImportsRecord(record).toModel());
  }

  async getResultScriptId(params: {
    id: string;
  }): Promise<Result<number, ScriptImportNotFound>> {
    const [importRow] = await this.sql<{ result_script_id: number }[]>`
        SELECT result_script_id
        FROM script_imports
        WHERE id = ${params.id}`;
    if (!importRow) {
      return Result.failure(new ScriptImportNotFound());
    }
    return Result.ok(importRow.result_script_id);
  }

  async setScriptImportSuccess(params: {
    importId: string;
    scriptId: number;
    metadata: {
      title: string;
      author: string;
      genre?: string | undefined;
      period?: string | undefined;
      language: Language | undefined;
      numberOfRoles: number;
      numberOfMaleRoles: number;
      numberOfFemaleRoles: number;
      suggestions?: Record<string, string>;
      characters: any[];
    };
  }): Promise<void> {
    await this.sql`
      UPDATE script_imports
        SET status = 'reviewing'::script_import_status_enum,
          result_script_id = ${params.scriptId},
          result_metadata_title = ${params.metadata.title},
          result_metadata_author = ${params.metadata.author},
          result_metadata_language = ${params.metadata.language ?? null},
          result_metadata_characters = ${params.metadata.characters ? this.sql.json(params.metadata.characters) : null},
          result_metadata_number_of_roles = ${params.metadata.numberOfRoles},
          result_metadata_number_of_male_roles = ${params.metadata.numberOfMaleRoles},
          result_metadata_number_of_female_roles = ${params.metadata.numberOfFemaleRoles},
          result_metadata_genre = ${params.metadata.genre ?? null},
          result_metadata_period = ${params.metadata.period ?? null},
          result_metadata_suggestions = ${params.metadata.suggestions ? this.sql.json(params.metadata.suggestions) : null}
        WHERE id = ${params.importId};
    `;
  }

  async setScriptImportFailure(params: {
    importId: string;
    error: string;
  }): Promise<void> {
    await this.sql`
      UPDATE script_imports
        SET status = 'error'::script_import_status_enum, error = ${!!params.error}
        WHERE id = ${params.importId};
      `;
  }

  async setScriptImportDone(params: { importId: string }): Promise<void> {
    await this.sql`
      UPDATE script_imports
        SET status = 'done'::script_import_status_enum
        WHERE id = ${params.importId};
      `;
  }
}
