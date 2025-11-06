export interface LineDiff {
  id: string;
  change:
    | {
        type: 'create_update';
        content:
          | {
              type: 'chartext';
              text: string;
              characters: string[];
            }
          | {
              type: 'heading';
              text: string;
              headingLevel: number;
            }
          | {
              type: 'freetext';
              text: string;
            };
      }
    | {
        type: 'delete';
      };
  lastModifiedDate: Date;
  // posLastModifiedDate: Date;
  version: number;
  previousVersionsIds?: string[];
}

export interface ScriptDiff {
  diffs: LineDiff[];
  lastModifiedDate: Date;
  linesOrder: string[];
  checksum: string;
}
