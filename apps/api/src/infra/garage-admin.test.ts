import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createGarageKey } from "./garage-admin.ts";

const ADMIN_URL = "http://garage.test:3903";
const TOKEN = "admin-token";

function mockFetchOnce(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("garage-admin client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("createGarageKey posts to /v2/CreateKey with createBucket permission", async () => {
    const fetchMock = mockFetchOnce(200, {
      accessKeyId: "GKabc",
      secretAccessKey: "secret",
    });
    const key = await createGarageKey(ADMIN_URL, TOKEN, "marivo-api-test");
    expect(key).toEqual({ accessKeyId: "GKabc", secretAccessKey: "secret" });
    expect(fetchMock).toHaveBeenCalledWith(
      `${ADMIN_URL}/v2/CreateKey`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
        body: JSON.stringify({
          name: "marivo-api-test",
          neverExpires: true,
          allow: { createBucket: true },
        }),
      }),
    );
  });

  it("throws on a non-ok response", async () => {
    mockFetchOnce(403, { code: "Forbidden", message: "no" });
    await expect(createGarageKey(ADMIN_URL, TOKEN, "x")).rejects.toThrow(/403/);
  });
});
