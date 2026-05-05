import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@18.3.0';
import { StripeSync } from 'npm:@supabase/stripe-sync-engine@0.37.2';

const SUBSCRIPTION_EVENTS = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);

function getRequiredEnvVar(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

const stripeWebhookSecret = getRequiredEnvVar('STRIPE_WEBHOOK_SECRET');

const stripeSync = new StripeSync({
  poolConfig: {
    connectionString: getRequiredEnvVar('DATABASE_URL'),
    max: 5,
    keepAlive: true,
  },
  stripeSecretKey: getRequiredEnvVar('STRIPE_SECRET_KEY'),
  stripeWebhookSecret,
  backfillRelatedEntities: false,
  autoExpandLists: true,
});

const stripe = new Stripe(getRequiredEnvVar('STRIPE_SECRET_KEY'));
const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'POST' },
    });
  }

  const stripeSignature = req.headers.get('stripe-signature');
  if (!stripeSignature) {
    return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const rawBody = new Uint8Array(await req.arrayBuffer());
    const event = await stripe.webhooks.constructEventAsync(
      rawBody,
      stripeSignature,
      stripeWebhookSecret,
      undefined,
      cryptoProvider,
    );

    if (SUBSCRIPTION_EVENTS.has(event.type)) {
      await stripeSync.processEvent(event);
    }

    return new Response(null, {
      status: 202,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
