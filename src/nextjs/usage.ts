import { BillingCore } from '../index';
import { UsageRecord } from '../core/models/types';

// Pages Router (API Routes) record usage handler factory
export function pagesRouterRecordUsage(core: BillingCore) {
  return async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    const body = req.body ?? {};
    const record: UsageRecord = {
      id: body.id ?? `u_${Date.now()}`,
      customerId: body.customerId,
      subscriptionId: body.subscriptionId,
      metric: body.metric ?? 'units',
      quantity: Math.max(0, Number(body.quantity ?? 0)),
      timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
    };

    await core.recordUsage(record);
    res.status(200).json({ ok: true });
  };
}

// App Router (Route Handlers) record usage handler factory
export function appRouterRecordUsage(core: BillingCore) {
  return async function handler(req: any) {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { 'Allow': 'POST', 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const record: UsageRecord = {
      id: body.id ?? `u_${Date.now()}`,
      customerId: body.customerId,
      subscriptionId: body.subscriptionId,
      metric: body.metric ?? 'units',
      quantity: Math.max(0, Number(body.quantity ?? 0)),
      timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
    };

    await core.recordUsage(record);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}