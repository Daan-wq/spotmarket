import { Queue } from "bullmq";
import Redis from "ioredis";

const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

export const autopostRenderQueue = new Queue("autopost-render", { connection });
export const thumbnailQueue = new Queue<{ contentBufferId: string }>("autopost-thumbnail", { connection });
