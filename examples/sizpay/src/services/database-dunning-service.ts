import { db } from '../db/client';
import { dunningCampaigns, dunningAttempts, dunningSubscriptionState, payments } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { DunningService } from '@mhbdev/bdk/services';
import { DunningCampaign, DunningCampaignConfig, DunningAttempt, Payment } from '@mhbdev/bdk/core';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { RedisLock } from '../utils/redis-lock';
import { DatabasePaymentService } from './database-payment-service';

export class DatabaseDunningService extends DunningService {
  private lock: RedisLock;
  constructor(private readonly paymentService: DatabasePaymentService, redisUrl?: string) {
    super();
    const redis = redisUrl ? new Redis(redisUrl) : undefined;
    this.lock = new RedisLock(redis);
  }

  async createCampaign(config: DunningCampaignConfig): Promise<DunningCampaign> {
    const id = randomUUID();
    const now = new Date();
    await db.insert(dunningCampaigns).values({ id, name: config.name, steps: config.steps as any, enabled: true, createdAt: now, updatedAt: now }).execute();
    return { id, name: config.name, steps: config.steps, enabled: true, createdAt: now, updatedAt: now };
  }

  async handleFailedPayment(paymentId: string): Promise<DunningAttempt> {
    const pRow = (await db.select().from(payments).where(eq(payments.id, paymentId)).execute()).at(0);
    if (!pRow) throw new Error('Payment not found');
    const subId = pRow.subscriptionId;
    if (!subId) throw new Error('Payment missing subscriptionId for dunning');
    const campaign = (await db.select().from(dunningCampaigns).where(eq(dunningCampaigns.enabled, true)).execute()).at(0);
    if (!campaign) throw new Error('No active dunning campaign');

    const firstRetryStep = (campaign.steps as any as { dayOffset: number; action: string; config: Record<string, any>; }[]).find(s => s.action === 'retry_payment');
    const attemptNumber = 1;
    const scheduledAt = new Date(Date.now() + (firstRetryStep?.dayOffset ?? 1) * 86400000);
    const id = randomUUID();
    const now = new Date();
    await db.insert(dunningAttempts).values({ id, subscriptionId: subId, paymentId, attemptNumber, scheduledAt, executedAt: null, status: 'scheduled', result: null, createdAt: now, updatedAt: now }).execute();
    return { id, subscriptionId: subId, paymentId, attemptNumber, scheduledAt, status: 'scheduled', createdAt: now, updatedAt: now } as DunningAttempt;
  }

  async retryPayment(subscriptionId: string, attemptNumber: number): Promise<Payment> {
    const attempt = (await db.select().from(dunningAttempts).where(and(eq(dunningAttempts.subscriptionId, subscriptionId), eq(dunningAttempts.attemptNumber, attemptNumber))).execute()).at(0);
    if (!attempt) throw new Error('Dunning attempt not found');
    const lockKey = `dunning:retry:${subscriptionId}:${attemptNumber}`;
    const ok = await this.lock.acquire(lockKey, 30);
    if (!ok) throw new Error('Another worker is processing this attempt');
    try {
      const lastFailed = (await db.select().from(payments).where(and(eq(payments.subscriptionId, subscriptionId), eq(payments.status, 'failed'))).orderBy(desc(payments.createdAt)).execute()).at(0);
      if (!lastFailed) throw new Error('No failed payment to retry');
      const payment = await this.paymentService.retry(lastFailed.id);
      const now = new Date();
      await db.update(dunningAttempts).set({ status: payment.status === 'succeeded' ? 'succeeded' : 'failed', executedAt: now, updatedAt: now, result: payment.failureReason || null }).where(eq(dunningAttempts.id, attempt.id)).execute();
      return payment;
    } finally {
      await this.lock.release(lockKey);
    }
  }

  async pauseDunning(subscriptionId: string, pauseUntil?: Date): Promise<void> {
    const now = new Date();
    await db.insert(dunningSubscriptionState).values({ subscriptionId, paused: true, pauseUntil: pauseUntil ?? null, createdAt: now, updatedAt: now }).onConflictDoUpdate({ target: dunningSubscriptionState.subscriptionId, set: { paused: true, pauseUntil: pauseUntil ?? null, updatedAt: now } }).execute();
  }

  async resumeDunning(subscriptionId: string): Promise<void> {
    const now = new Date();
    await db.insert(dunningSubscriptionState).values({ subscriptionId, paused: false, pauseUntil: null, createdAt: now, updatedAt: now }).onConflictDoUpdate({ target: dunningSubscriptionState.subscriptionId, set: { paused: false, pauseUntil: null, updatedAt: now } }).execute();
  }
}