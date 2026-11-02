import { describe, it, expect } from "vitest";
import { reducer, type ScriptState } from "./script-state";
import { getLineContentForDisplayWithInfo } from "./script.utils";
import type { Line, LineContent } from "./script.models";

function makeVersionContent(
  id: string,
  lineId: string,
  version: number,
  text: string,
): LineContent {
  return {
    id,
    lineId,
    type: "saved_version",
    lineType: "freetext",
    text,
    version,
    lastModifiedDate: new Date("2026-01-01T09:00:00Z"),
    authorUsername: "seb",
  };
}

function makeState(): ScriptState {
  const line: Line = {
    id: "line-1",
    type: "freetext",
    lastModifiedDate: new Date("2026-01-01T09:00:00Z"),
  };
  return {
    lastModifiedDate: new Date("2026-01-01T10:00:00Z"),
    remoteLastModifiedDate: new Date("2026-01-01T09:00:00Z"),
    lines: new Map([[line.id, line]]),
    lineContents: new Map([
      ["c1", makeVersionContent("c1", "line-1", 1, "version 1")],
      ["c2", makeVersionContent("c2", "line-1", 2, "version 2")],
      [
        "d1",
        {
          id: "d1",
          lineId: "line-1",
          type: "shared_draft",
          lineType: "freetext",
          text: "shared draft",
          version: null,
          lastModifiedDate: new Date("2026-01-01T09:30:00Z"),
          authorUsername: "seb",
        },
      ],
    ]),
    lineToContents: new Map([
      ["line-1", { sharedDrafts: ["d1"], versions: ["", "c1", "c2"] }],
    ]),
    linesOrder: ["line-1"],
    characters: {},
    checksums: new Map(),
    scriptChecksum: null,
    outline: [],
  };
}

function latestChangesAction(diffs: unknown[], lastModifiedDate = "2026-01-01T11:00:00Z") {
  return {
    type: "PROCESS_LATEST_CHANGES_PAYLOAD",
    payload: {
      diffs,
      lastModifiedDate: new Date(lastModifiedDate),
      linesOrder: ["line-1"],
      characters: {},
      checksum: "checksum",
    },
  } as never;
}

const sharedDraftDiff = {
  id: "d2",
  lineId: "line-1",
  type: "shared_draft",
  version: null,
  lastModifiedDate: new Date("2026-01-01T11:00:00Z"),
  authorUsername: "seb",
  change: {
    type: "content_create_update",
    content: { lineType: "freetext", text: "shared draft" },
  },
};

describe("reducer PROCESS_LATEST_CHANGES_PAYLOAD", () => {
  it("content_delete removes the version content and its reference", () => {
    const state = makeState();
    const next = reducer(state, latestChangesAction([
      {
        id: "c2",
        lineId: "line-1",
        type: "saved_version",
        version: 2,
        lastModifiedDate: new Date("2026-01-01T11:00:00Z"),
        authorUsername: "seb",
        change: { type: "content_delete" },
      },
    ]));

    expect(next.lineContents.has("c2")).toBe(false);
    const contents = next.lineToContents.get("line-1");
    expect(contents?.versions.filter(Boolean)).toEqual(["c1"]);

    // The display content must fall back to the latest non-deleted version,
    // never to the deleted row (which has no text and crashed ScriptLine).
    const line = next.lines.get("line-1");
    const [displayContent, lineInfo] = getLineContentForDisplayWithInfo(
      line as Line,
      next.lineContents,
      next.lineToContents,
    );
    expect(displayContent.id).toBe("c1");
    expect(displayContent.text).toBe("version 1");
    expect(lineInfo.hasPreviousVersions).toBe(false);
  });

  it("content_delete on a shared draft removes it from sharedDrafts", () => {
    const state = makeState();
    const next = reducer(state, latestChangesAction([
      {
        id: "d1",
        lineId: "line-1",
        type: "shared_draft",
        version: null,
        lastModifiedDate: new Date("2026-01-01T11:00:00Z"),
        authorUsername: "seb",
        change: { type: "content_delete" },
      },
    ]));

    expect(next.lineContents.has("d1")).toBe(false);
    expect(next.lineToContents.get("line-1")?.sharedDrafts).toEqual([]);
  });

  it("content_create_update still registers new versions and shared drafts", () => {
    const state = makeState();
    const next = reducer(state, latestChangesAction([
      {
        id: "c3",
        lineId: "line-1",
        type: "saved_version",
        version: 3,
        lastModifiedDate: new Date("2026-01-01T11:00:00Z"),
        authorUsername: "seb",
        change: {
          type: "content_create_update",
          content: { lineType: "freetext", text: "version 3" },
        },
      },
      {
        id: "d2",
        lineId: "line-1",
        type: "shared_draft",
        version: null,
        lastModifiedDate: new Date("2026-01-01T11:00:00Z"),
        authorUsername: "seb",
        change: {
          type: "content_create_update",
          content: { lineType: "freetext", text: "new shared draft" },
        },
      },
    ]));

    expect(next.lineContents.get("c3")?.text).toBe("version 3");
    expect(next.lineToContents.get("line-1")?.versions[3]).toBe("c3");
    expect(next.lineToContents.get("line-1")?.sharedDrafts).toEqual(["d1", "d2"]);

    const line = next.lines.get("line-1");
    const [displayContent, lineInfo] = getLineContentForDisplayWithInfo(
      line as Line,
      next.lineContents,
      next.lineToContents,
    );
    expect(displayContent.id).toBe("c3");
    expect(lineInfo.hasPreviousVersions).toBe(true);
  });

  it("is idempotent: replaying the same payload does not duplicate shared drafts", () => {
    const state = makeState();
    const action = latestChangesAction([sharedDraftDiff]);
    const once = reducer(state, action);
    const twice = reducer(once, action);

    expect(twice.lineToContents.get("line-1")?.sharedDrafts).toEqual(["d1", "d2"]);
    // Applying the same payload twice yields the same content map
    expect(twice.lineContents.get("d2")?.text).toBe("shared draft");
    expect(twice.lineContents.size).toBe(once.lineContents.size);
  });

  it("ignores stale payloads older than the last applied remote date", () => {
    const state = makeState();
    const fresh = reducer(state, latestChangesAction([sharedDraftDiff]));
    expect(fresh.remoteLastModifiedDate.getTime()).toBe(
      new Date("2026-01-01T11:00:00Z").getTime(),
    );

    const stale = reducer(
      fresh,
      latestChangesAction(
        [
          {
            id: "c9",
            lineId: "line-1",
            type: "saved_version",
            version: 9,
            lastModifiedDate: new Date("2026-01-01T10:00:00Z"),
            authorUsername: "seb",
            change: {
              type: "content_create_update",
              content: { lineType: "freetext", text: "stale version" },
            },
          },
        ],
        "2026-01-01T10:30:00Z",
      ),
    );
    // Out-of-order/older response must not be applied at all
    expect(stale).toBe(fresh);
    expect(stale.lineContents.has("c9")).toBe(false);
  });

  it("stores draft rows in the draft slot (keyed by line id) without touching sharedDrafts", () => {
    const state = makeState();
    const next = reducer(state, latestChangesAction([
      {
        id: "draft-row-uuid",
        lineId: "line-1",
        type: "draft",
        version: null,
        lastModifiedDate: new Date("2026-01-01T11:00:00Z"),
        authorUsername: "seb",
        change: {
          type: "content_create_update",
          content: { lineType: "freetext", text: "server draft" },
        },
      },
    ]));

    const draft = next.lineContents.get("line-1");
    expect(draft?.id).toBe("line-1");
    expect(draft?.type).toBe("draft");
    expect(draft?.text).toBe("server draft");
    expect(next.lineContents.has("draft-row-uuid")).toBe(false);
    expect(next.lineToContents.get("line-1")?.sharedDrafts).toEqual(["d1"]);
    expect(next.lineToContents.get("line-1")?.versions.filter(Boolean)).toEqual(["c1", "c2"]);
  });

  it("does not let an older server draft clobber a newer local draft", () => {
    const state = makeState();
    // Local draft newer than the incoming server draft
    state.lineContents.set("line-1", {
      id: "line-1",
      lineId: "line-1",
      type: "draft",
      lineType: "freetext",
      text: "newer local edit",
      version: 0,
      lastModifiedDate: new Date("2026-01-01T12:00:00Z"),
      authorUsername: "seb",
    });

    const next = reducer(state, latestChangesAction([
      {
        id: "draft-row-uuid",
        lineId: "line-1",
        type: "draft",
        version: null,
        lastModifiedDate: new Date("2026-01-01T11:00:00Z"),
        authorUsername: "seb",
        change: {
          type: "content_create_update",
          content: { lineType: "freetext", text: "older server draft" },
        },
      },
    ]));

    expect(next.lineContents.get("line-1")?.text).toBe("newer local edit");
  });

  it("content_delete on a draft clears the draft slot for that line", () => {
    const state = makeState();
    state.lineContents.set("line-1", {
      id: "line-1",
      lineId: "line-1",
      type: "draft",
      lineType: "freetext",
      text: "local draft",
      version: 0,
      lastModifiedDate: new Date("2026-01-01T10:00:00Z"),
      authorUsername: "seb",
    });

    const next = reducer(state, latestChangesAction([
      {
        id: "draft-row-uuid",
        lineId: "line-1",
        type: "draft",
        version: null,
        lastModifiedDate: new Date("2026-01-01T11:00:00Z"),
        authorUsername: "seb",
        change: { type: "content_delete" },
      },
    ]));

    expect(next.lineContents.has("line-1")).toBe(false);
    expect(next.lineToContents.get("line-1")?.sharedDrafts).toEqual(["d1"]);
  });

  it("an older draft content_delete does not wipe a newer local draft", () => {
    const state = makeState();
    state.lineContents.set("line-1", {
      id: "line-1",
      lineId: "line-1",
      type: "draft",
      lineType: "freetext",
      text: "fresh local edit",
      version: 0,
      lastModifiedDate: new Date("2026-01-01T12:00:00Z"),
      authorUsername: "seb",
    });

    const next = reducer(state, latestChangesAction([
      {
        id: "draft-row-uuid",
        lineId: "line-1",
        type: "draft",
        version: null,
        lastModifiedDate: new Date("2026-01-01T10:00:00Z"),
        authorUsername: "seb",
        change: { type: "content_delete" },
      },
    ]));

    expect(next.lineContents.get("line-1")?.text).toBe("fresh local edit");
  });
});

describe("getLineContentForDisplayWithInfo", () => {
  it("never selects a deleted content row as display content", () => {
    const state = makeState();
    // Simulate a deleted row still present in the map with a dangling reference
    state.lineContents.set("c2", { ...makeVersionContent("c2", "line-1", 2, "version 2"), deleted: true });
    const line = state.lines.get("line-1") as Line;
    const [displayContent] = getLineContentForDisplayWithInfo(
      line,
      state.lineContents,
      state.lineToContents,
    );
    expect(displayContent.deleted).toBeFalsy();
    expect(displayContent.id).toBe("c1");
    expect(displayContent.text).toBe("version 1");
    expect(typeof displayContent.text).toBe("string");
  });
});
