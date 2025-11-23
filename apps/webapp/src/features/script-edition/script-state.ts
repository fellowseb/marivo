import type { AppRouterOutput } from '@marivo/api';
import type {
  CueLineContent,
  FreeTextLineContent,
  HeadingLineContent,
  Line,
  LineContent,
} from '../../components/script.models';
import { assertUnreachable } from '@marivo/utils';

export interface LineContents {
  sharedDrafts: string[];
  versions: string[];
}

export interface ScriptState {
  lastModifiedDate: Date;
  remoteLastModifiedDate: Date;
  lines: Map<string, Line>;
  lineContents: Map<string, LineContent>;
  linesOrder: string[];
  characters: { [id: string]: string };
  checksums: Map<string, string>;
  scriptChecksum: string | null;
  lineToContents: Map<string, LineContents>;
}

export type ScriptAction =
  | {
      type: 'PROCESS_LATEST_CHANGES_PAYLOAD';
      payload: AppRouterOutput['script']['latestChanges'];
    }
  | {
      type: 'INSERT_HEADING_LINE';
      id: string;
      lastModifiedDate: Date;
      pos: number;
      level: number;
    }
  | {
      type: 'INSERT_CUE_LINE';
      id: string;
      lastModifiedDate: Date;
      pos: number;
      characterId?: string;
    }
  | {
      type: 'INSERT_FREETEXT_LINE';
      id: string;
      lastModifiedDate: Date;
      pos: number;
      init: string;
    }
  | {
      type: 'INIT_DRAFT';
      lastModifiedDate: Date;
      content: LineContent;
      text?: string;
      deleted?: boolean;
    }
  | {
      type: 'UNDO_INIT_DRAFT';
      lineId: string;
      lastModifiedDate: Date;
    }
  | {
      type: 'EDIT_LINE';
      id: string;
      lastModifiedDate: Date;
      text: string;
    }
  | {
      type: 'UNDO_EDIT_LINE';
      id: string;
      lineLastModifiedDate: Date;
      lastModifiedDate: Date;
      text: string;
    }
  | {
      type: 'REMOVE_LINES';
      ids: string[];
    }
  | {
      type:
        | 'UNDO_INSERT_CUE_LINE'
        | 'UNDO_INSERT_HEADING_LINE'
        | 'UNDO_INSERT_FREETEXT_LINE';
      id: string;
      lastModifiedDate: Date;
    }
  | {
      type: 'DISCARD_CHANGES';
      id: string;
      lastModifiedDate: Date;
    }
  | {
      type: 'UNDO_DISCARD_CHANGES';
      id: string;
      lastModifiedDate: Date;
      content: LineContent;
    }
  | {
      type: 'SAVE_CHANGES';
      id: string;
    };

export function reducer(state: ScriptState, action: ScriptAction): ScriptState {
  switch (action.type) {
    case 'PROCESS_LATEST_CHANGES_PAYLOAD': {
      const lineToContents = new Map(state.lineToContents);
      const [lines, lineContents] = action.payload.diffs.reduce(
        ([accLines, accLineContents], curr) => {
          if ('lineType' in curr) {
            if (curr.change.type === 'line_create') {
              accLines.set(curr.id, {
                id: curr.id,
                lastModifiedDate: curr.lastModifiedDate,
                type: curr.lineType,
              } satisfies Line);
              lineToContents.set(curr.id, {
                sharedDrafts: [],
                versions: [],
              });
            } else {
              assertUnreachable(curr.change.type);
            }
          } else {
            let m = lineToContents.get(curr.lineId);
            if (!m) {
              m = {
                sharedDrafts: [],
                versions: [],
              };
              console.warn('Unexpected case');
            }
            if (curr.type === 'shared_draft') {
              m.sharedDrafts.push(curr.id);
            } else if (curr.type === 'saved_version') {
              if (!curr.version) {
                console.warn('Unexpected empty version');
              }
              m.versions[curr.version ?? 1] = curr.id;
            }
            lineToContents.set(curr.lineId, m);
            if (curr.change.type === 'content_delete') {
              accLineContents.set(curr.id, {
                id: curr.id,
                lineId: curr.lineId,
                version: curr.version,
                lastModifiedDate: curr.lastModifiedDate,
                type: curr.type,
                deleted: true,
              } satisfies LineContent);
            } else if (curr.change.type === 'content_create_update') {
              accLineContents.set(curr.id, {
                id: curr.id,
                lineId: curr.lineId,
                type: curr.type,
                version: curr.version,
                lastModifiedDate: curr.lastModifiedDate,
                ...curr.change.content,
              } satisfies LineContent);
            } else {
              assertUnreachable(curr.change);
            }
          }
          return [accLines, accLineContents];
        },
        [new Map(state.lines), new Map(state.lineContents)],
      );
      const remoteLastModifiedDate =
        state.remoteLastModifiedDate.getTime() !==
        action.payload.lastModifiedDate.getTime()
          ? action.payload.lastModifiedDate
          : state.remoteLastModifiedDate;
      // TODO: compare linesOrder
      // TODO: compare characters
      // TODO: recompute checksum
      return {
        lineToContents,
        remoteLastModifiedDate,
        lastModifiedDate: state.lastModifiedDate,
        lines,
        lineContents,
        linesOrder: action.payload.linesOrder,
        characters: action.payload.characters ?? {},
        checksums: state?.checksums ?? new Map(),
        scriptChecksum: state?.scriptChecksum ?? null,
      };
    }
    case 'INSERT_HEADING_LINE': {
      const lines = new Map(state.lines);
      const lineContents = new Map(state.lineContents);
      const { id, lastModifiedDate } = action;
      lines.set(id, {
        type: 'heading',
        lastModifiedDate,
        id,
      } satisfies Line);
      const headingLevel = action.level ?? 1;
      const text =
        headingLevel === 0
          ? 'Title'
          : headingLevel === 1
            ? 'Act'
            : headingLevel === 2
              ? 'Scene'
              : 'Heading';
      lineContents.set(id, {
        lineType: 'heading',
        type: 'draft',
        lastModifiedDate,
        text,
        version: 0,
        headingLevel: action.level ?? 1,
        id,
        lineId: id,
      } satisfies HeadingLineContent);
      const linesOrder = [
        ...state.linesOrder.slice(0, action.pos),
        id,
        ...state.linesOrder.slice(action.pos),
      ];
      return {
        ...state,
        lastModifiedDate,
        lines,
        lineContents,
        linesOrder,
      };
    }
    case 'INSERT_CUE_LINE': {
      const lines = new Map(state.lines);
      const lineContents = new Map(state.lineContents);
      const { id, lastModifiedDate } = action;
      lines.set(id, {
        lastModifiedDate,
        id,
        type: 'chartext',
      } satisfies Line);
      lineContents.set(id, {
        lineId: id,
        type: 'draft',
        lineType: 'chartext',
        lastModifiedDate,
        text: '',
        characters:
          action.characterId !== undefined ? [action.characterId] : [],
        version: 0,
        id,
      } satisfies CueLineContent);
      const linesOrder = [
        ...state.linesOrder.slice(0, action.pos),
        id,
        ...state.linesOrder.slice(action.pos),
      ];
      return {
        ...state,
        lastModifiedDate,
        lines,
        lineContents,
        linesOrder,
      };
    }
    case 'INSERT_FREETEXT_LINE': {
      const lines = new Map(state.lines);
      const lineContents = new Map(state.lineContents);
      const { id, lastModifiedDate } = action;
      lines.set(id, {
        type: 'freetext',
        lastModifiedDate,
        id,
      } satisfies Line);
      lineContents.set(id, {
        lineId: id,
        lineType: 'freetext',
        type: 'draft',
        lastModifiedDate,
        text: action.init,
        version: 0,
        id,
      } satisfies FreeTextLineContent);
      const linesOrder = [
        ...state.linesOrder.slice(0, action.pos),
        id,
        ...state.linesOrder.slice(action.pos),
      ];
      return {
        ...state,
        lastModifiedDate,
        lines,
        lineContents,
        linesOrder,
      };
    }
    case 'UNDO_INSERT_CUE_LINE':
    case 'UNDO_INSERT_HEADING_LINE':
    case 'UNDO_INSERT_FREETEXT_LINE': {
      const lines = new Map(state.lines);
      const lineContents = new Map(state.lineContents);
      const linesOrder = [...state.linesOrder];
      const { id, lastModifiedDate } = action;
      lines.delete(id);
      lineContents.delete(id);
      const idx = linesOrder.findIndex((s) => s === id);
      if (idx >= 0) {
        linesOrder.splice(idx, 1);
      }
      return {
        ...state,
        lastModifiedDate,
        lines,
        linesOrder,
      };
    }
    case 'INIT_DRAFT': {
      const { content, lastModifiedDate } = action;
      const lineContents = new Map(state.lineContents);
      lineContents.set(content.lineId, {
        ...content,
        type: 'draft',
        id: content.lineId,
        ...(action.text ? { text: action.text } : {}),
        ...(action.deleted ? { deleted: action.deleted } : { deleted: false }),
        lastModifiedDate,
      } satisfies LineContent);
      return {
        ...state,
        lastModifiedDate,
        lineContents,
      };
    }
    case 'UNDO_INIT_DRAFT': {
      const lineContents = new Map(state.lineContents);
      lineContents.delete(action.lineId);
      return {
        ...state,
        lineContents,
        lastModifiedDate: action.lastModifiedDate,
      };
    }
    case 'EDIT_LINE': {
      const { id, lastModifiedDate } = action;
      if (!state.lineContents.has(id)) {
        return state;
      }
      const lineContents = new Map(state.lineContents);
      const existingLineContent = lineContents.get(id);
      if (!existingLineContent || existingLineContent.type !== 'draft') {
        console.warn('Unexpected line type');
        return state;
      }
      lineContents.set(id, {
        ...existingLineContent,
        text: action.text,
        lastModifiedDate,
      } satisfies LineContent);
      return {
        ...state,
        lastModifiedDate,
        lineContents,
      };
    }
    case 'UNDO_EDIT_LINE': {
      const { id, lastModifiedDate, lineLastModifiedDate } = action;
      if (!state.lineContents.has(id)) {
        return state;
      }
      const lineContents = new Map(state.lineContents);
      const existingLineContent = lineContents.get(id);
      if (!existingLineContent || existingLineContent.type !== 'draft') {
        console.warn('Unexpected line type');
        return state;
      }
      lineContents.set(id, {
        ...existingLineContent,
        text: action.text,
        lastModifiedDate: lineLastModifiedDate,
      } satisfies LineContent);
      return {
        ...state,
        lastModifiedDate,
        lineContents,
      };
    }
    case 'REMOVE_LINES': {
      // const lines = new Map(state.lines);
      // const linesOrder = [...state.linesOrder];
      // action.ids.forEach((id) => {
      //   lines.delete(id);
      //   const idx = linesOrder.findIndex((s) => s === id);
      //   if (idx >= 0) {
      //     linesOrder.splice(idx, 1);
      //   }
      // });
      // const lastModifiedDate = new Date(Date.now());
      // return {
      //   lastModifiedDate,
      //   remoteLastModifiedDate: state.remoteLastModifiedDate,
      //   lines,
      //   linesOrder,
      //   characters: state.characters,
      //   checksums: state.checksums, // TODO recompute
      //   scriptChecksum: state.scriptChecksum, // TODO recompute
      // };
      return state;
    }
    case 'DISCARD_CHANGES': {
      const { id, lastModifiedDate } = action;
      const lineContents = new Map(state.lineContents);
      lineContents.delete(id);
      return {
        ...state,
        lastModifiedDate,
        lineContents,
      };
    }
    case 'UNDO_DISCARD_CHANGES': {
      const { id, content, lastModifiedDate } = action;
      const lineContents = new Map(state.lineContents);
      lineContents.set(id, content);
      return {
        ...state,
        lastModifiedDate,
        lineContents,
      };
    }
    case 'SAVE_CHANGES': {
      const { id } = action;
      const content = state.lineContents.get(id);
      const contents = state.lineToContents.get(id);
      const versionnedContent =
        contents && contents.versions.length
          ? state.lineContents.get(
              contents.versions.slice().reverse().find(Boolean) ?? '',
            )
          : undefined;
      if (!content || !versionnedContent) {
        console.warn('Unexpected state during SAVE_CHANGES');
        return state;
      }
      const lineContents = new Map(state.lineContents);
      lineContents.set(versionnedContent.id, {
        ...content,
        id: versionnedContent.id,
        lineId: versionnedContent.lineId,
        version: versionnedContent.version,
      } satisfies LineContent);
      lineContents.delete(id);
      return {
        ...state,
        lineContents,
      };
    }
    default:
      assertUnreachable(action);
  }
}
