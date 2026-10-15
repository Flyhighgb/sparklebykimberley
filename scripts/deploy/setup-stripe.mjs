// Makes sure Stripe has the two delivery rates (flat and free) and a webhook pointing at the
// Worker. Safe to run on every deploy. Writes the IDs to the file given as the first argument.
import fs from 'node:fs';
import { API_URL, mask, need, wrangler } from './lib.mjs';

const key = need('STRIPE_SECRET_KEY');
const out = process.argv[2];
let workerHasWebhookSecret = false;
try {
  workerHasWebhookSecret = JSON.parse(wrangler(['secret', 'list', '--format', 'json'], { quiet: true })).some((s) => s.name === 'STRIPE_WEBHOOK_SECRET');
} catch {
  /* Worker not deployed yet */
}
const settings = JSON.parse(fs.readFileSync('src/data/settings.json', 'utf8'));
const flatPence = Math.round(Number(settings.deliveryFlatRate) * 100);

async function stripe(method, path, params) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: { authorization: `Bearer ${key}`, ...(params ? { 'content-type': 'application/x-www-form-urlencoded' } : {}) },
    body: params ? new URLSearchParams(params) : undefined,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Stripe ${method} ${path}: ${body.error?.message || res.status}`);
  return body;
}

// Delivery rates, tagged with metadata so we can find them again.
const { data: rates } = await stripe('GET', '/shipping_rates?active=true&limit=100');
async function ensureRate(tag, name, pence, minDays, maxDays) {
  const existing = rates.find((r) => r.metadata?.sparkle === tag);
  if (existing && existing.fixed_amount?.amount === pence) return existing.id;
  if (existing) await stripe('POST', `/shipping_rates/${existing.id}`, { active: 'false' }); // price changed
  const created = await stripe('POST', '/shipping_rates', {
    display_name: name,
    type: 'fixed_amount',
    'fixed_amount[amount]': String(pence),
    'fixed_amount[currency]': 'gbp',
    'delivery_estimate[minimum][unit]': 'business_day',
    'delivery_estimate[minimum][value]': String(minDays),
    'delivery_estimate[maximum][unit]': 'business_day',
    'delivery_estimate[maximum][value]': String(maxDays),
    'metadata[sparkle]': tag,
  });
  console.log(`✔ Created Stripe delivery rate "${name}"`);
  return created.id;
}
const result = {
  STRIPE_SHIPPING_RATE_STANDARD: await ensureRate('standard', 'UK delivery', flatPence, 3, 9),
  STRIPE_SHIPPING_RATE_FREE: await ensureRate('free', 'Free UK delivery', 0, 3, 9),
};

// Webhook. Stripe only reveals the signing secret when the endpoint is created, so if the
// Worker doesn't have it yet we (re)create the endpoint.
const url = `${API_URL}/api/stripe-webhook`;
const events = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];
const { data: hooks } = await stripe('GET', '/webhook_endpoints?limit=100');
const hook = hooks.find((h) => h.url === url);
if (!hook || !workerHasWebhookSecret) {
  if (hook) await stripe('DELETE', `/webhook_endpoints/${hook.id}`);
  const params = { url, description: 'Sparkle by Kimberley order Worker' };
  events.forEach((e, i) => (params[`enabled_events[${i}]`] = e));
  const created = await stripe('POST', '/webhook_endpoints', params);
  mask(created.secret);
  result.STRIPE_WEBHOOK_SECRET = created.secret;
  console.log('✔ Created the Stripe webhook');
} else {
  console.log('✔ Stripe webhook already set up');
}
fs.writeFileSync(out, JSON.stringify(result));
console.log(`✔ Stripe is ready (${key.startsWith('sk_live') ? 'LIVE' : 'test'} mode)`);
