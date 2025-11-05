import Redis from 'ioredis';

export class RedisLock {
  constructor(private readonly redis?: Redis) {}

  async acquire(key: string, ttlSec = 30): Promise<boolean> {
    if (!this.redis) return true;
    const res = await this.redis.set(key, '1', 'EX', ttlSec, 'NX');
    return res === 'OK';
  }

  async release(key: string): Promise<void> {
    if (!this.redis) return;
    await this.redis.del(key);
  }
}