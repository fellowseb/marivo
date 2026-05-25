import { Queue } from 'bullmq';

type MarivoJob = 'process-script-text-files';

let instance: MessageBroker;

export class MessageBroker {
  constructor() {
    this.jobsQueue = new Queue('marivo-jobs', {
      connection: {
        host: process.env.REDIS_HOST ?? 'redis',
        port: Number.parseInt(process.env.REDIS_PORT ?? '6379'),
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
    throw new Error('MessageBroker not initialized');
  }
  return instance;
}
