export interface LineVersion {
  version: number;
  text: string;
}

export interface PartName {
  partName: string;
  depth: number;
}

export interface Line {
  character?: string;
  text: string;
  version?: number;
  previousVersions?: LineVersion[];
}

export type LineBase = Line | PartName;

export interface Script {
  lines: LineBase[];
}
