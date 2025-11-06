export interface LineCommons {
  id: string;
  version: number;
  previousVersionsIds?: string[];
  lastModifiedDate: Date;
}

export type FreeTextLine = {
  type: 'freetext';
  text: string;
} & LineCommons;

export type HeadingLine = {
  type: 'heading';
  text: string;
  headingLevel: number;
} & LineCommons;

export type CharacterTextLine = {
  type: 'chartext';
  characters: string[];
  text: string;
} & LineCommons;

export type Line = CharacterTextLine | HeadingLine | FreeTextLine;
