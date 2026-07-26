export type ScriptImportStatus =
  | 'uploading_files'
  | 'processing_files'
  | 'reviewing'
  | 'done'
  | 'error';

export type ScriptImport =
  | {
      id: string;
      status: Exclude<ScriptImportStatus, 'reviewing'>;
    }
  | {
      id: string;
      status: ScriptImportStatus & 'reviewing';
      metadata: {
        title: string;
        author: string;
        language: string;
        characters: any[];
        number_of_roles: number;
        number_of_male_roles: number;
        number_of_female_roles: number;
        genre?: string | undefined;
        period?: string | undefined;
        suggestions?: Record<string, string> | undefined;
      };
    };

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

export type Language = 'fr' | 'en';

export const Languages: Language[] = ['fr', 'en'];
