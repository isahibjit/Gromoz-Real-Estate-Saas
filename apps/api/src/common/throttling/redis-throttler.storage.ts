import { Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { RedisService } from '../../redis/redis.service';

interface RedisThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redisService: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<RedisThrottlerStorageRecord> {
    const ttlMs = Math.max(ttl, 1);
    const blockMs = Math.max(blockDuration || ttlMs, 1);
    const hitsKey = `rate-limit:${throttlerName}:${key}:hits`;
    const blockKey = `rate-limit:${throttlerName}:${key}:block`;
    const client = this.redisService.getClient();

    const blockTtl = await client.pttl(blockKey);
    if (blockTtl > 0) {
      return {
        totalHits: limit + 1,
        timeToExpire: Math.max(await client.pttl(hitsKey), 0),
        isBlocked: true,
        timeToBlockExpire: blockTtl,
      };
    }

    const totalHits = await client.incr(hitsKey);
    if (totalHits === 1) {
      await client.pexpire(hitsKey, ttlMs);
    }

    const timeToExpire = Math.max(await client.pttl(hitsKey), 0);
    const isBlocked = totalHits > limit;

    if (isBlocked) {
      await client.set(blockKey, '1', 'PX', blockMs);
    }

    return {
      totalHits,
      timeToExpire,
      isBlocked,
      timeToBlockExpire: isBlocked ? blockMs : 0,
    };
  }
}
