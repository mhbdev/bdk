import { PlanService, PlanFilters, PlanChangeCalculation } from '@mhbdev/bdk/services';
import { SubscriptionPlan, BillingInterval, Money } from '@mhbdev/bdk/core';
import { db } from '../db/client';
import { subscriptionPlans } from '../db/schema';
import { eq } from 'drizzle-orm';

function uuid() { return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('hex'); }

export class DatabasePlanService extends PlanService {
  async create(plan: Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionPlan> {
    const id = uuid();
    const now = new Date();
    await db.insert(subscriptionPlans).values({
      id,
      name: plan.name,
      description: plan.description || null,
      amount: String(plan.price.amount),
      currency: plan.price.currency,
      interval: plan.interval,
      intervalCount: plan.intervalCount,
      trialPeriodDays: plan.trialPeriodDays || null,
      features: plan.features || {},
      metadata: plan.metadata || null,
      active: true,
      createdAt: now,
      updatedAt: now
    }).execute();
    return await this.getById(id) as SubscriptionPlan;
  }

  async update(planId: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const now = new Date();
    await db.update(subscriptionPlans).set(mapPlanUpdate(updates, now)).where(eq(subscriptionPlans.id, planId)).execute();
    return (await this.getById(planId))!;
  }

  async archive(planId: string): Promise<void> {
    await db.update(subscriptionPlans).set({ active: false, updatedAt: new Date() }).where(eq(subscriptionPlans.id, planId)).execute();
  }

  async getById(planId: string): Promise<SubscriptionPlan | null> {
    const pRows = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId)).limit(1).execute();
    const p = pRows[0];
    if (!p) return null;
    return {
      id: p.id,
      name: p.name,
      description: p.description || undefined,
      price: { amount: Number(p.amount), currency: p.currency },
      interval: p.interval as BillingInterval,
      intervalCount: p.intervalCount,
      trialPeriodDays: p.trialPeriodDays || undefined,
      features: p.features,
      metadata: p.metadata || undefined,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt)
    };
  }

  async listActive(filters?: PlanFilters): Promise<SubscriptionPlan[]> {
    const list = await db.select().from(subscriptionPlans).execute();
    return list.filter(p => p.active === true).map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || undefined,
      price: { amount: Number(p.amount), currency: p.currency },
      interval: p.interval as BillingInterval,
      intervalCount: p.intervalCount,
      trialPeriodDays: p.trialPeriodDays || undefined,
      features: p.features,
      metadata: p.metadata || undefined,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt)
    }));
  }

  async canDowngrade(fromPlanId: string, toPlanId: string): Promise<boolean> { return true; }

  async calculatePlanChange(subscriptionId: string, newPlanId: string): Promise<PlanChangeCalculation> {
    // Simple: no proration
    const newPlan = await this.getById(newPlanId);
    if (!newPlan) throw new Error('Plan not found');
    return {
      proratedCredit: money(0, newPlan.price.currency),
      proratedCharge: newPlan.price,
      netAmount: newPlan.price,
      effectiveDate: new Date(),
      nextBillingDate: new Date()
    };
  }
}

function money(amount: number, currency: string): Money { return { amount, currency }; }
function mapPlanUpdate(updates: Partial<SubscriptionPlan>, now: Date) {
  const out: any = { updatedAt: now };
  if (updates.name) out.name = updates.name;
  if (updates.description !== undefined) out.description = updates.description;
  if (updates.price) { out.amount = String(updates.price.amount); out.currency = updates.price.currency; }
  if (updates.interval) out.interval = updates.interval;
  if (updates.intervalCount) out.intervalCount = updates.intervalCount;
  if (updates.trialPeriodDays !== undefined) out.trialPeriodDays = updates.trialPeriodDays;
  if (updates.features) out.features = updates.features;
  if (updates.metadata) out.metadata = updates.metadata;
  return out;
}