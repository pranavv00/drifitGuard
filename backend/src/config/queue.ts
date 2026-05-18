import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const csvQueue = new Queue('csv-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

export const csvQueueEvents = new QueueEvents('csv-processing', {
  connection: new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  }),
});
