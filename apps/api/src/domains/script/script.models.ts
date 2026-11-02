export interface LineDiff {
  id: string;
  lineType: "chartext" | "freetext" | "heading";
  change: {
    type: "line_create";
  };
  lastModifiedDate: Date;
}

export type LineContentType = "saved_version" | "shared_draft" | "draft";

export interface LineContentDiff {
  id: string;
  lineId: string;
  lastModifiedDate: Date;
  type: LineContentType;
  version: number;
  authorUsername: string;
  change:
    | {
        type: "content_create_update";
        content:
          | {
              lineType: "chartext";
              text: string;
              characters: string[];
            }
          | {
              lineType: "heading";
              text: string;
              headingLevel: number;
            }
          | {
              lineType: "freetext";
              text: string;
            };
      }
    | {
        type: "content_delete";
      };
}

export interface ScriptDiff {
  diffs: (LineDiff | LineContentDiff)[];
  lastModifiedDate: Date;
  linesOrder: string[];
  characters: { [id: string]: string };
  checksum: string;
}
