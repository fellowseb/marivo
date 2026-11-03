import { InternalServerError } from "../shared/error.ts";
import { getConfig } from "./config.ts";
import { Queue } from "bullmq";

type MarivoJob = "process-script-text-files";

let instance: MessageBroker;

export class MessageBroker {
  constructor() {
    const { redis } = getConfig();
    this.jobsQueue = new Queue("marivo-jobs", {
      connection: {
        host: redis.host,
        port: redis.port,
      },
    });
  }

  async publish(queueName: MarivoJob, message: unknown) {
    await this.jobsQueue.add(queueName, message, {
      attempts: 1,
      removeOnFail: true,
    });
  }

  private jobsQueue: Queue;
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
