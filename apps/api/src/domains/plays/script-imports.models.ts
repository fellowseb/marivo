export type ScriptImportStatus =
  | 'uploading_files'
  | 'processing_files'
  | 'reviewing'
  | 'done'
  | 'error';

export interface ScriptImport {
  id: string;
  status: ScriptImportStatus;
}

export interface ScriptImportForProcessing {
  files: Files;
}

export interface Files {
  [id: string]:
    | {
        type: 'url';
        url: string;
        size: undefined;
        status: 'waiting' | 'in-progress' | 'ready';
      }
    | {
        type: 'file';
        name: string;
        size: number;
        status: 'waiting' | 'in-progress' | 'ready';
      };
}
