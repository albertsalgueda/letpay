import { Hono } from 'hono';
import type { Dependencies } from '../deps.js';
import type { AuthorizationEvent } from '@letpay/core';

export function webhookRoutes(deps: Dependencies) {
  const router = new Hono();

  // POST /v1/webhooks/stripe
  router.post('/stripe', async (c) => {
    try {
      const body = await c.req.text();
      const signature = c.req.header('stripe-signature') ?? '';
      const event = deps.paymentService.constructWebhookEvent(body, signature);

      switch (event.type) {
        case 'checkout.session.completed': {
          await deps.fundingService.handlePaymentCompleted(
            event.data.sessionId!,
            event.data.paymentIntentId!,
          );
          break;
        }
        case 'payment_intent.succeeded': {
          await deps.fundingService.handlePaymentSucceeded(event.data.paymentIntentId!);
          break;
        }
        case 'payment_intent.payment_failed': {
          await deps.fundingService.handlePaymentFailed(event.data.paymentIntentId!);
          break;
        }
      }

      return c.json({ received: true });
    } catch (err) {
      console.error('Stripe webhook error:', err);
      return c.json({ error: 'Webhook processing failed' }, 400);
    }
  });

  // POST /v1/webhooks/wallester
  router.post('/wallester', async (c) => {
    try {
      const body = await c.req.text();
      const signature = c.req.header('x-wallester-signature') ?? '';
      const event = deps.cardService.constructWebhookEvent(body, signature);

      switch (event.type) {
        case 'authorization.request': {
          const authEvent = event.data as AuthorizationEvent;
          const result = await deps.authorizationService.handleAuthorization(authEvent);
          return c.json(result);
        }
      }

      return c.json({ received: true });
    } catch (err) {
      console.error('Wallester webhook error:', err);
      return c.json({ error: 'Webhook processing failed' }, 400);
    }
  });

  return router;
}
