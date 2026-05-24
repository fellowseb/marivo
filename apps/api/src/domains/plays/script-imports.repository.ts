import { Result } from '@marivo/utils';
import { Record } from '../../shared/record.ts';
import { AppError } from '../../shared/error.ts';
import { UserRepositoryBase } from '../../shared/user-repository-base.ts';
import type {
  Files,
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
}

export class GetScriptImportsRecord extends Record<GetScriptImportsRecordValues> {
  toModel(): ScriptImport {
    return {
      id: this.get('id'),
      status: this.get('status') as ScriptImportStatus,
    };
  }
}

interface GetScriptImportFilesForProcessingRecordValues {
  files: any;
}

export class GetScriptImportFilesForProcessingRecord extends Record<GetScriptImportFilesForProcessingRecordValues> {
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
          status
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
          status
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
  }): Promise<void> {
    await this.sql`
      UPDATE script_imports
        SET status = 'reviewing'::script_import_status_enum, result_script_id = ${params.scriptId}
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
}
