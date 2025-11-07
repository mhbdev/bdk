import { BillingCore } from '../index';
import { Plan } from '../core/models/types';
import { start as startSubscription } from '../sdk/subscription';

// Pages Router (API Routes) start subscription handler factory
export function pagesRouterStartSubscription(core: BillingCore) {
  return async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    const body = req.body ?? {};
    const plan: Plan | null = body.plan ?? (body.planId ? await core.getPlanById(body.planId) : null);
    if (!plan) {
      res.status(404).json({ error: 'Plan not found' });
      return;
    }
    const periodStart = new Date(body.periodStart ?? new Date());
    const periodEnd = new Date(body.periodEnd ?? new Date());

    const result = await startSubscription(core, {
      customerId: body.customerId,
      plan,
      seats: body.seats,
      periodStart,
      periodEnd,
      subscriptionId: body.subscriptionId,
      metadata: body.metadata,
    });

    res.status(200).json(result);
  };
}

// App Router (Route Handlers) start subscription handler factory
export function appRouterStartSubscription(core: BillingCore) {
  return async function handler(req: any) {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { 'Allow': 'POST', 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const plan: Plan | null = body.plan ?? (body.planId ? await core.getPlanById(body.planId) : null);
    if (!plan) {
      return new Response(JSON.stringify({ error: 'Plan not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const periodStart = new Date(body.periodStart ?? new Date());
    const periodEnd = new Date(body.periodEnd ?? new Date());

    const result = await startSubscription(core, {
      customerId: body.customerId,
      plan,
      seats: body.seats,
      periodStart,
      periodEnd,
      subscriptionId: body.subscriptionId,
      metadata: body.metadata,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}