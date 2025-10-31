import { WebhookProcessResult, WebhookService } from "../services";

/**
 * Configuration for webhook handlers
 */
export interface WebhookHandlerConfig {
  webhookService: WebhookService;
  providerId: string;
  signatureHeader?: string;
  payloadTransform?: (body: any) => string;
  onSuccess?: (result: WebhookProcessResult) => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
}

/**
 * Next.js App Router webhook handlers
 */
export interface NextJsAppRouterHandlers {
  POST: (request: Request) => Promise<Response>;
  GET?: (request: Request) => Promise<Response>;
}

/**
 * Next.js Pages API webhook handlers
 */
export type NextJsPagesHandler = (req: any, res: any) => Promise<void>;

/**
 * Express.js webhook handlers
 */
export type ExpressHandler = (req: any, res: any, next: any) => Promise<void>;

/**
 * Base webhook adapter class
 */
export abstract class WebhookAdapter {
  constructor(protected config: WebhookHandlerConfig) {}

  /**
   * Extract signature from headers
   */
  protected getSignature(headers: Headers | Record<string, string>): string {
    const signatureHeader = this.config.signatureHeader || 'stripe-signature';
    
    if (headers instanceof Headers) {
      return headers.get(signatureHeader) || '';
    }
    
    return headers[signatureHeader] || headers[signatureHeader.toLowerCase()] || '';
  }

  /**
   * Convert headers to record
   */
  protected headersToRecord(headers: Headers): Record<string, string> {
    const record: Record<string, string> = {};
    headers.forEach((value, key) => {
      record[key] = value;
    });
    return record;
  }

  /**
   * Process the webhook
   */
  protected async processWebhook(
    body: string,
    signature: string,
    headers: Record<string, string>
  ): Promise<WebhookProcessResult> {
    try {
      const result = await this.config.webhookService.processWebhook(
        this.config.providerId,
        body,
        signature,
        headers
      );

      if (this.config.onSuccess) {
        await this.config.onSuccess(result);
      }

      return result;
    } catch (error) {
      if (this.config.onError) {
        await this.config.onError(error as Error);
      }
      throw error;
    }
  }
}

/**
 * Next.js App Router adapter
 * 
 * Usage:
 * ```typescript
 * // app/api/webhooks/stripe/route.ts
 * import { createNextJsAppRouterHandlers } from '@yourcompany/billing-sdk/adapters';
 * 
 * const handlers = createNextJsAppRouterHandlers({
 *   webhookService: myWebhookService,
 *   providerId: 'stripe',
 * });
 * 
 * export const POST = handlers.POST;
 * ```
 */
export class NextJsAppRouterAdapter extends WebhookAdapter {
  toHandlers(): NextJsAppRouterHandlers {
    return {
      POST: async (request: Request) => {
        try {
          // Read the body as text
          const body = await request.text();
          const signature = this.getSignature(request.headers);
          const headers = this.headersToRecord(request.headers);

          // Transform payload if needed
          const payload = this.config.payloadTransform 
            ? this.config.payloadTransform(body)
            : body;

          // Process the webhook
          const result = await this.processWebhook(payload, signature, headers);

          // Return success response
          return new Response(
            JSON.stringify({ 
              received: true, 
              eventType: result.eventType 
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        } catch (error) {
          console.error('Webhook processing error:', error);
          
          return new Response(
            JSON.stringify({ 
              error: 'Webhook processing failed',
              message: error instanceof Error ? error.message : 'Unknown error'
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      },
      
      // Optional GET handler for webhook verification
      GET: async () => {
        return new Response(
          JSON.stringify({ 
            status: 'ok',
            provider: this.config.providerId 
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      },
    };
  }
}

/**
 * Next.js Pages API adapter
 * 
 * Usage:
 * ```typescript
 * // pages/api/webhooks/stripe.ts
 * import { createNextJsPagesHandler } from '@yourcompany/billing-sdk/adapters';
 * 
 * export const config = {
 *   api: { bodyParser: false }
 * };
 * 
 * export default createNextJsPagesHandler({
 *   webhookService: myWebhookService,
 *   providerId: 'stripe',
 * });
 * ```
 */
export class NextJsPagesAdapter extends WebhookAdapter {
  toHandler(): NextJsPagesHandler {
    return async (req: any, res: any) => {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      try {
        // Get raw body
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        const body = Buffer.concat(chunks).toString('utf8');

        const signature = this.getSignature(req.headers);
        const headers = req.headers;

        // Transform payload if needed
        const payload = this.config.payloadTransform 
          ? this.config.payloadTransform(body)
          : body;

        // Process the webhook
        const result = await this.processWebhook(payload, signature, headers);

        res.status(200).json({ 
          received: true, 
          eventType: result.eventType 
        });
      } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(400).json({ 
          error: 'Webhook processing failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };
  }
}

/**
 * Express.js adapter
 * 
 * Usage:
 * ```typescript
 * import express from 'express';
 * import { createExpressHandler } from '@yourcompany/billing-sdk/adapters';
 * 
 * const app = express();
 * 
 * app.post(
 *   '/api/webhooks/stripe',
 *   express.raw({ type: 'application/json' }),
 *   createExpressHandler({
 *     webhookService: myWebhookService,
 *     providerId: 'stripe',
 *   })
 * );
 * ```
 */
export class ExpressAdapter extends WebhookAdapter {
  toHandler(): ExpressHandler {
    return async (req: any, res: any) => {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      try {
        // Get raw body (assumes express.raw() middleware)
        const body = req.body.toString('utf8');
        const signature = this.getSignature(req.headers);
        const headers = req.headers;

        // Transform payload if needed
        const payload = this.config.payloadTransform 
          ? this.config.payloadTransform(body)
          : body;

        // Process the webhook
        const result = await this.processWebhook(payload, signature, headers);

        res.status(200).json({ 
          received: true, 
          eventType: result.eventType 
        });
      } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(400).json({ 
          error: 'Webhook processing failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };
  }
}

/**
 * Factory functions for easier usage
 */

/**
 * Create Next.js App Router handlers
 */
export function createNextJsAppRouterHandlers(
  config: WebhookHandlerConfig
): NextJsAppRouterHandlers {
  const adapter = new NextJsAppRouterAdapter(config);
  return adapter.toHandlers();
}

/**
 * Create Next.js Pages API handler
 */
export function createNextJsPagesHandler(
  config: WebhookHandlerConfig
): NextJsPagesHandler {
  const adapter = new NextJsPagesAdapter(config);
  return adapter.toHandler();
}

/**
 * Create Express.js handler
 */
export function createExpressHandler(
  config: WebhookHandlerConfig
): ExpressHandler {
  const adapter = new ExpressAdapter(config);
  return adapter.toHandler();
}

/**
 * Generic webhook handler creator
 * Automatically detects the framework and returns appropriate handlers
 */
export function createWebhookHandlers(
  framework: 'nextjs-app' | 'nextjs-pages' | 'express',
  config: WebhookHandlerConfig
): NextJsAppRouterHandlers | NextJsPagesHandler | ExpressHandler {
  switch (framework) {
    case 'nextjs-app':
      return createNextJsAppRouterHandlers(config);
    case 'nextjs-pages':
      return createNextJsPagesHandler(config);
    case 'express':
      return createExpressHandler(config);
    default:
      throw new Error(`Unsupported framework: ${framework}`);
  }
}