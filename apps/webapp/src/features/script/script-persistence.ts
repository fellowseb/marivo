import type { ScriptState } from './script-state';

const STORAGE_KEY_PREFIX = 'marivo:script-state:';
const STORAGE_VERSION = 1;

interface PersistedScriptState {
  version: number;
  uri: string;
  from: string;
  savedAt: string;
  state: {
    lastModifiedDate: string;
    remoteLastModifiedDate: string;
    lines: [string, unknown][];
    lineContents: [string, unknown][];
    lineToContents: [string, unknown][];
    linesOrder: string[];
    characters: { [id: string]: string };
    outline: { lineId: string; heading: string; headingLevel: number }[];
  };
}

function serializeState(state: ScriptState, uri: string, from: string): PersistedScriptState {
  return {
    version: STORAGE_VERSION,
    uri,
    from,
    savedAt: new Date().toISOString(),
    state: {
      lastModifiedDate: state.lastModifiedDate.toISOString(),
      remoteLastModifiedDate: state.remoteLastModifiedDate.toISOString(),
      lines: Array.from(state.lines.entries()),
      lineContents: Array.from(state.lineContents.entries()),
      lineToContents: Array.from(state.lineToContents.entries()),
      linesOrder: state.linesOrder,
      characters: state.characters,
      outline: state.outline,
    },
  };
}

function deserializeState(persisted: PersistedScriptState): ScriptState | null {
  try {
    if (persisted.version !== STORAGE_VERSION) {
      return null;
    }
    return {
      lastModifiedDate: new Date(persisted.state.lastModifiedDate),
      remoteLastModifiedDate: new Date(persisted.state.remoteLastModifiedDate),
      lines: new Map(persisted.state.lines as [string, never][]),
      lineContents: new Map(persisted.state.lineContents as [string, never][]),
      lineToContents: new Map(persisted.state.lineToContents as [string, never][]),
      linesOrder: persisted.state.linesOrder,
      characters: persisted.state.characters,
      checksums: new Map(),
      scriptChecksum: null,
      outline: persisted.state.outline,
    };
  } catch (e) {
    console.warn('Failed to deserialize persisted script state:', e);
    return null;
  }
}

export function saveScriptState(state: ScriptState, uri: string, from: string): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${uri}:${from}`;
    const persisted = serializeState(state, uri, from);
    localStorage.setItem(key, JSON.stringify(persisted));
  } catch (e) {
    console.warn('Failed to save script state to localStorage:', e);
  }
}

export function loadScriptState(uri: string, from: string): ScriptState | null {
  try {
    const key = `${STORAGE_KEY_PREFIX}${uri}:${from}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const persisted = JSON.parse(raw) as PersistedScriptState;
    if (persisted.uri !== uri || persisted.from !== from) return null;
    return deserializeState(persisted);
  } catch (e) {
    console.warn('Failed to load script state from localStorage:', e);
    return null;
  }
}

export function clearScriptState(uri: string, from: string): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${uri}:${from}`;
    localStorage.removeItem(key);
  } catch (e) {
    console.warn('Failed to clear script state from localStorage:', e);
  }
}

export function clearAllScriptStates(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (e) {
    console.warn('Failed to clear all script states:', e);
  }
}
