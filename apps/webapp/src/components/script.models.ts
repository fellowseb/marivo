export type LineContentType = 'draft' | 'shared_draft' | 'saved_version';

export type LineType = 'freetext' | 'heading' | 'chartext';

export type LineContent =
  | CueLineContent
  | HeadingLineContent
  | FreeTextLineContent;

export interface LineContentCommons {
  id: string;
  lineId: string;
  type: LineContentType;
  version: number | null;
  lastModifiedDate: Date;
  deleted?: boolean;
}

export type FreeTextLineContent = {
  lineType: LineType & 'freetext';
  text: string;
} & LineContentCommons;

export type HeadingLineContent = {
  lineType: LineType & 'heading';
  text: string;
  headingLevel: number;
} & LineContentCommons;

export type CueLineContent = {
  lineType: LineType & 'chartext';
  characters: string[];
  text: string;
} & LineContentCommons;

export interface Line {
  id: string;
  type: LineType;
  lastModifiedDate: Date;
}
