import type { Env } from './env';
import { hmacHex, safeEqual } from './util';

const API = 'https://api.stripe.com/v1';

/** Flatten nested objects into Stripe's form encoding: a[b][0][c]=value */
export function formEncode(obj: Record<string, unknown>, prefix = '', out = new URLSearchParams()): URLSearchParams {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => (typeof item === 'object' ? formEncode(item as Record<string, unknown>, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(item))));
    else if (typeof v === 'object') formEncode(v as Record<string, unknown>, key, out);
    else out.append(key, String(v));
  }
  return out;
}

async function stripe<T>(env: Env, method: 'GET' | 'POST', path: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(body ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: body ? formEncode(body) : undefined,
  });
  const data = (await res.json()) as T & { error?: { message: string } };
  if (!res.ok) throw new Error(`Stripe: ${data.error?.message || res.status}`);
  return data;
}

export interface StripeAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}
export interface CheckoutSession {
  id: string;
  payment_status: 'paid' | 'unpaid' | 'no_payment_required';
  payment_intent?: string | null;
  amount_subtotal: number;
  amount_total: number;
  customer_details?: { email?: string | null; name?: string | null; phone?: string | null; address?: StripeAddress | null } | null;
  shipping_details?: { name?: string | null; address?: StripeAddress | null } | null;
  collected_information?: { shipping_details?: { name?: string | null; address?: StripeAddress | null } | null } | null;
  shipping_cost?: { amount_total: number } | null;
  metadata?: Record<string, string>;
}
export interface LineItem {
  quantity: number;
  description: string;
  price: { unit_amount: number; product: { name: string; metadata: Record<string, string> } };
}

export function createCheckoutSession(env: Env, params: Record<string, unknown>) {
  return stripe<{ id: string; url: string }>(env, 'POST', '/checkout/sessions', params);
}

export function getSession(env: Env, id: string) {
  return stripe<CheckoutSession>(env, 'GET', `/checkout/sessions/${encodeURIComponent(id)}`);
}

export async function getLineItems(env: Env, id: string): Promise<LineItem[]> {
  const r = await stripe<{ data: LineItem[] }>(env, 'GET', `/checkout/sessions/${encodeURIComponent(id)}/line_items?limit=100&expand[]=data.price.product`);
  return r.data;
}

/** Shipping details moved in newer Stripe API versions, so check both places. */
export function shippingOf(s: CheckoutSession) {
  return s.collected_information?.shipping_details || s.shipping_details || null;
}

/**
 * Verify the Stripe-Signature header (https://docs.stripe.com/webhooks#verify-manually).
 * Returns the parsed event, or null if the signature is wrong or too old.
 */
export async function verifyWebhook(
  rawBody: string,
  header: string | null,
  secret: string,
  toleranceSeconds = 300,
  now = Math.floor(Date.now() / 1000),
): Promise<{ id: string; type: string; data: { object: CheckoutSession } } | null> {
  if (!header || !secret) return null;
  const parts = header.split(',').map((p) => p.split('=') as [string, string]);
  const t = parts.find(([k]) => k === 't')?.[1];
  const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || !sigs.length) return null;
  if (Math.abs(now - Number(t)) > toleranceSeconds) return null;
  const expected = await hmacHex(secret, `${t}.${rawBody}`);
  if (!sigs.some((s) => safeEqual(s, expected))) return null;
  return JSON.parse(rawBody);
}
