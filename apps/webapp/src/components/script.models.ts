export type LineContentType = 'draft' | 'shared_draft' | 'saved_version';

export type LineType = 'freetext' | 'heading' | 'chartext';

export interface FreeTextLineEditableContent {
  lineType: LineType & 'freetext';
  text: string;
  deleted?: boolean;
}

export interface HeadingLineEditableContent {
  lineType: LineType & 'heading';
  text: string;
  headingLevel: number;
  deleted?: boolean;
}

export interface CueLineEditableContent {
  lineType: LineType & 'chartext';
  characters: string[];
  text: string;
  deleted?: boolean;
}

export function createEditableContent<TLineType extends LineType>(
  lineType: TLineType,
  content: Omit<
    TLineType extends 'chartext'
      ? CueLineEditableContent
      : TLineType extends 'freetext'
        ? FreeTextLineEditableContent
        : HeadingLineEditableContent,
    'lineType'
  >,
): LineEditableContent {
  return {
    lineType,
    ...content,
  } as LineEditableContent;
}

export type LineEditableContent =
  | CueLineEditableContent
  | HeadingLineEditableContent
  | FreeTextLineEditableContent;

export interface LineContentCommons {
  id: string;
  lineId: string;
  type: LineContentType;
  version: number | null;
  lastModifiedDate: Date;
}

export type FreeTextLineContent = FreeTextLineEditableContent &
  LineContentCommons;

export type HeadingLineContent = HeadingLineEditableContent &
  LineContentCommons;

export type CueLineContent = CueLineEditableContent & LineContentCommons;

export type LineContent =
  | CueLineContent
  | HeadingLineContent
  | FreeTextLineContent;

export interface Line {
  id: string;
  type: LineType;
  lastModifiedDate: Date;
}
