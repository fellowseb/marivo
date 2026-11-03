import { InternalServerError } from "../shared/error.ts";
import { getConfig } from "./config.ts";
import { Queue } from "bullmq";
import { Redis } from "ioredis";

type MarivoJob = "process-script-text-files";

let instance: MessageBroker;

export class MessageBroker {
  constructor() {
    const { redis } = getConfig();
    const connection = {
      host: redis.host,
      port: redis.port,
    };
    this.jobsQueue = new Queue("marivo-jobs", { connection });
    // Dedicated lightweight client for the readiness probe
    // (bullmq v6 does not expose the queue's client)
    this.healthClient = new Redis({ ...connection, lazyConnect: true, maxRetriesPerRequest: 1 });
  }

  async publish(queueName: MarivoJob, message: unknown) {
    await this.jobsQueue.add(queueName, message, {
      attempts: 1,
      removeOnFail: true,
    });
  }

  /** Readiness probe: can we reach Redis? */
  async ping(): Promise<boolean> {
    try {
      // lazyConnect clients must be connected explicitly before commands
      await this.healthClient.connect();
      return (await this.healthClient.ping()) === "PONG";
    } catch {
      return false;
    } finally {
      this.healthClient.disconnect();
    }
  }

  private jobsQueue: Queue;
  private healthClient: Redis;
}

export function initMessageBroker() {
  instance = new MessageBroker();
}

export function getMessageBroker() {
  if (!instance) {
    throw new InternalServerError("MessageBroker not initialized");
  }
  return instance;
}
