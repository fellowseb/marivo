import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { Result } from "@marivo/utils";
import { requirePlayPermission } from "./play-permission.middleware.ts";
import { PlayAccessForbidden, PlayNotFound } from "./user-plays.repository.ts";

const checkPlayPermission = vi.fn();

vi.mock("../../infra/db.ts", () => ({
  getDatabase: () => ({ begin: async (fn: (sql: unknown) => Promise<void>) => fn({}) }),
}));

vi.mock("./user-plays.repository.ts", async (importOriginal) => {
  const mod = await importOriginal<typeof import("./user-plays.repository.ts")>();
  return {
    ...mod,
    UserPlaysRepository: class {
      checkPlayPermission = checkPlayPermission;
    },
  };
});

function callMiddleware(input: unknown) {
  const next = vi.fn().mockResolvedValue("ok");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mw = requirePlayPermission("scriptWrite") as any;
  return { run: () => mw({ ctx: { req: {} }, input, next }), next };
}

describe("requirePlayPermission middleware", () => {
  beforeEach(() => {
    checkPlayPermission.mockReset();
  });

  it("calls next when the permission is granted", async () => {
    checkPlayPermission.mockResolvedValue(Result.ok(undefined));
    const { run, next } = callMiddleware({ uri: "u1", from: "play" });
    await expect(run()).resolves.toBe("ok");
    expect(next).toHaveBeenCalled();
    expect(checkPlayPermission).toHaveBeenCalledWith({ uri: "u1", permission: "scriptWrite" });
  });

  it("rejects with FORBIDDEN (403) when the permission is missing", async () => {
    checkPlayPermission.mockResolvedValue(Result.failure(new PlayAccessForbidden()));
    const { run, next } = callMiddleware({ uri: "u1", from: "play" });
    await expect(run()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(next).not.toHaveBeenCalled();
    await expect(run()).rejects.toBeInstanceOf(TRPCError);
  });

  it("rejects with NOT_FOUND (404) when the play does not exist / no access", async () => {
    checkPlayPermission.mockResolvedValue(Result.failure(new PlayNotFound("u1")));
    const { run } = callMiddleware({ uri: "u1", from: "play" });
    await expect(run()).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("skips the check for non-play sources (import/collection)", async () => {
    const { run, next } = callMiddleware({ uri: "u1", from: "collection" });
    await expect(run()).resolves.toBe("ok");
    expect(next).toHaveBeenCalled();
    expect(checkPlayPermission).not.toHaveBeenCalled();
  });

  it("treats a missing 'from' as play (the default source)", async () => {
    checkPlayPermission.mockResolvedValue(Result.ok(undefined));
    const { run } = callMiddleware({ uri: "u1" });
    await run();
    expect(checkPlayPermission).toHaveBeenCalledWith({ uri: "u1", permission: "scriptWrite" });
  });
});
