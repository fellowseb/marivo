import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  saveScriptState,
  loadScriptState,
  clearScriptState,
  clearAllScriptStates,
} from './script-persistence';
import type { ScriptState } from './script-state';

function makeState(overrides: Partial<ScriptState> = {}): ScriptState {
  return {
    lastModifiedDate: new Date('2026-01-01T10:00:00Z'),
    remoteLastModifiedDate: new Date('2026-01-01T09:00:00Z'),
    lines: new Map([
      ['line-1', { id: 'line-1', type: 'heading', lastModifiedDate: new Date() }],
    ]),
    lineContents: new Map([
      [
        'line-1',
        {
          id: 'line-1',
          lineId: 'line-1',
          lineType: 'heading',
          type: 'draft',
          text: 'Act I',
          headingLevel: 1,
          version: 0,
          lastModifiedDate: new Date(),
        } as never,
      ],
    ]),
    lineToContents: new Map([
      ['line-1', { sharedDrafts: [], versions: [] }],
    ]),
    linesOrder: ['line-1'],
    characters: { 'char-1': 'HAMLET' },
    checksums: new Map(),
    scriptChecksum: null,
    outline: [{ lineId: 'line-1', heading: 'Act I', headingLevel: 1 }],
    ...overrides,
  };
}

describe('script-persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('saveScriptState', () => {
    it('saves state to localStorage with correct key', () => {
      const state = makeState();
      saveScriptState(state, 'uri-123', 'play');

      const raw = localStorage.getItem('marivo:script-state:uri-123:play');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.version).toBe(1);
      expect(parsed.uri).toBe('uri-123');
      expect(parsed.from).toBe('play');
      const inner = JSON.parse(parsed.state);
      expect(inner.linesOrder).toEqual(['line-1']);
      expect(inner.characters).toEqual({ 'char-1': 'HAMLET' });
    });

    it('does not throw on localStorage failure', () => {
      const spy = jest
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new Error('QuotaExceeded');
        });
      expect(() =>
        saveScriptState(makeState(), 'uri', 'play'),
      ).not.toThrow();
      spy.mockRestore();
    });
  });

  describe('loadScriptState', () => {
    it('returns null when nothing is stored', () => {
      expect(loadScriptState('nonexistent', 'play')).toBeNull();
    });

    it('loads and deserializes saved state', () => {
      const state = makeState();
      saveScriptState(state, 'uri-123', 'play');

      const loaded = loadScriptState('uri-123', 'play');
      expect(loaded).not.toBeNull();
      expect(loaded!.linesOrder).toEqual(['line-1']);
      expect(loaded!.characters).toEqual({ 'char-1': 'HAMLET' });
      expect(loaded!.lines.get('line-1')?.type).toBe('heading');
      expect(loaded!.lineContents.get('line-1')).toBeDefined();
      expect(loaded!.lastModifiedDate).toBeInstanceOf(Date);
    });

    it('returns null when uri does not match', () => {
      saveScriptState(makeState(), 'uri-123', 'play');
      expect(loadScriptState('other-uri', 'play')).toBeNull();
    });

    it('returns null when from does not match', () => {
      saveScriptState(makeState(), 'uri-123', 'play');
      expect(loadScriptState('uri-123', 'import')).toBeNull();
    });

    it('returns null on corrupted data', () => {
      localStorage.setItem('marivo:script-state:bad:play', 'not json{{{');
      expect(loadScriptState('bad', 'play')).toBeNull();
    });

    it('returns null on version mismatch', () => {
      localStorage.setItem(
        'marivo:script-state:v:play',
        JSON.stringify({ version: 999, uri: 'v', from: 'play', state: {} }),
      );
      expect(loadScriptState('v', 'play')).toBeNull();
    });
  });

  describe('clearScriptState', () => {
    it('removes only the specified key', () => {
      saveScriptState(makeState(), 'uri-1', 'play');
      saveScriptState(makeState(), 'uri-2', 'play');

      clearScriptState('uri-1', 'play');

      expect(loadScriptState('uri-1', 'play')).toBeNull();
      expect(loadScriptState('uri-2', 'play')).not.toBeNull();
    });
  });

  describe('clearAllScriptStates', () => {
    it('removes all script state keys but keeps other keys', () => {
      saveScriptState(makeState(), 'uri-1', 'play');
      saveScriptState(makeState(), 'uri-2', 'import');
      localStorage.setItem('other-key', 'value');

      clearAllScriptStates();

      expect(loadScriptState('uri-1', 'play')).toBeNull();
      expect(loadScriptState('uri-2', 'import')).toBeNull();
      expect(localStorage.getItem('other-key')).toBe('value');
    });
  });

  describe('round-trip', () => {
    it('save then load preserves all data', () => {
      const state = makeState({
        linesOrder: ['a', 'b', 'c'],
        characters: { x: 'YORICK', y: 'OPHELIA' },
      });
      saveScriptState(state, 'round-trip', 'play');
      const loaded = loadScriptState('round-trip', 'play');

      expect(loaded).not.toBeNull();
      expect(loaded!.linesOrder).toEqual(['a', 'b', 'c']);
      expect(loaded!.characters).toEqual({ x: 'YORICK', y: 'OPHELIA' });
      expect(loaded!.outline).toEqual(state.outline);
    });
  });
});
