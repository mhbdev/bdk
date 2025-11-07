import { BillingCore } from '../index';
import { WebhookService } from '../services/webhook/WebhookService';

// Pages Router (API Routes) webhook handler factory
export function pagesRouterWebhook(
  core: BillingCore,
  webhook: WebhookService,
  provider: string,
) {
  return async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    // Support raw body (e.g., Stripe) or parsed JSON
    let payload: any = req.body;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch { /* leave as string */ }
    }

    const event = webhook.normalize(payload, provider);
    core.receiveEvent(event);

    res.status(200).json({ ok: true });
  };
}

// App Router (Route Handlers) webhook handler factory
export function appRouterWebhook(
  core: BillingCore,
  webhook: WebhookService,
  provider: string,
) {
  return async function handler(req: any) {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { 'Allow': 'POST', 'Content-Type': 'application/json' },
      });
    }

    // Prefer raw text for providers that need signature verification upstream
    let payload: any;
    try {
      const text = await req.text();
      try { payload = JSON.parse(text); } catch { payload = text; }
    } catch {
      try { payload = await req.json(); } catch { payload = undefined; }
    }

    const event = webhook.normalize(payload, provider);
    core.receiveEvent(event);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}