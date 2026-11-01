import type { ScriptState } from "./script-state";

const STORAGE_KEY_PREFIX = "marivo:script-state:";
const STORAGE_VERSION = 1;

interface PersistedScriptState {
  version: number;
  uri: string;
  from: string;
  savedAt: string;
  state: string; // JSON-stringified with date reviver
}

function serializeState(state: ScriptState, uri: string, from: string): PersistedScriptState {
  // Use superjson-style date tagging so Dates survive JSON round-trip.
  // JSON.stringify's replacer runs bottom-up, so we tag Dates and Maps
  // before they get flattened to strings/plain objects.
  const serializable = {
    lastModifiedDate: state.lastModifiedDate,
    remoteLastModifiedDate: state.remoteLastModifiedDate,
    lines: state.lines,
    lineContents: state.lineContents,
    lineToContents: state.lineToContents,
    linesOrder: state.linesOrder,
    characters: state.characters,
    outline: state.outline,
  };
  // Pre-convert Maps to tagged arrays and Dates to tagged objects so the
  // JSON replacer sees them in their original form (replacer runs bottom-up,
  // so nested Dates inside Maps would otherwise become plain strings).
  function preConvert(value: unknown): unknown {
    if (value instanceof Date) return { __date: value.toISOString() };
    if (value instanceof Map) {
      return { __map: Array.from(value.entries()).map(([k, v]) => [k, preConvert(v)]) };
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(value))
        out[k] = preConvert((value as Record<string, unknown>)[k]);
      return out;
    }
    if (Array.isArray(value)) return value.map(preConvert);
    return value;
  }
  return {
    version: STORAGE_VERSION,
    uri,
    from,
    savedAt: new Date().toISOString(),
    state: JSON.stringify(preConvert(serializable)),
  };
}

interface SerializedMap {
  __map: [unknown, unknown][];
}
interface SerializedDate {
  __date: string;
}

function reviveDates(_key: string, value: unknown): unknown {
  if (value && typeof value === "object") {
    if ("__date" in value) {
      return new Date((value as SerializedDate).__date);
    }
    if ("__map" in value) {
      const entries = (value as SerializedMap).__map;
      // Recursively revive nested values inside the map entries
      const revived = entries.map(([k, v]) => [k, reviveDates("", v)] as [unknown, unknown]);
      return new Map(revived);
    }
  }
  return value;
}

function deserializeState(persisted: PersistedScriptState): ScriptState | null {
  try {
    if (persisted.version !== STORAGE_VERSION) {
      return null;
    }
    const s = JSON.parse(persisted.state, reviveDates) as {
      lastModifiedDate: Date;
      remoteLastModifiedDate: Date;
      lines: Map<string, unknown>;
      lineContents: Map<string, unknown>;
      lineToContents: Map<string, unknown>;
      linesOrder: string[];
      characters: { [id: string]: string };
      outline: { lineId: string; heading: string; headingLevel: number }[];
    };
    return {
      lastModifiedDate: s.lastModifiedDate,
      remoteLastModifiedDate: s.remoteLastModifiedDate,
      lines: s.lines as ScriptState["lines"],
      lineContents: s.lineContents as ScriptState["lineContents"],
      lineToContents: s.lineToContents as ScriptState["lineToContents"],
      linesOrder: s.linesOrder,
      characters: s.characters,
      checksums: new Map(),
      scriptChecksum: null,
      outline: s.outline,
    };
  } catch (e) {
    console.warn("Failed to deserialize persisted script state:", e);
    return null;
  }
}

export function saveScriptState(state: ScriptState, uri: string, from: string): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${uri}:${from}`;
    const persisted = serializeState(state, uri, from);
    localStorage.setItem(key, JSON.stringify(persisted));
  } catch (e) {
    console.warn("Failed to save script state to localStorage:", e);
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
    console.warn("Failed to load script state from localStorage:", e);
    return null;
  }
}

export function clearScriptState(uri: string, from: string): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${uri}:${from}`;
    localStorage.removeItem(key);
  } catch (e) {
    console.warn("Failed to clear script state from localStorage:", e);
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
    console.warn("Failed to clear all script states:", e);
  }
}
