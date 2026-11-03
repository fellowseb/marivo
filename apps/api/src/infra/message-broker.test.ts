import { describe, it, expect, vi } from "vitest";

const addMock = vi.fn().mockResolvedValue(undefined);
// Regular functions: they are called with `new`, so they must not be arrows.
const queueCtorMock = vi.fn(function () {
  return { add: addMock };
});
const redisCtorMock = vi.fn(function () {
  return { connect: vi.fn(), ping: vi.fn(), disconnect: vi.fn() };
});

vi.mock("bullmq", () => ({ Queue: queueCtorMock }));
vi.mock("ioredis", () => ({ Redis: redisCtorMock }));
vi.mock("./config.ts", () => ({
  getConfig: () => ({ redis: { host: "localhost", port: 6379 } }),
}));

describe("MessageBroker.publish", () => {
  it("enqueues jobs with retries, exponential backoff and job retention", async () => {
    vi.resetModules();
    const { MessageBroker } = await import("./message-broker.ts");
    const broker = new MessageBroker();

    await broker.publish("process-script-text-files", { importId: "imp-1" });

    expect(addMock).toHaveBeenCalledTimes(1);
    expect(addMock).toHaveBeenCalledWith(
      "process-script-text-files",
      { importId: "imp-1" },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );
  });
});
