import type { Env } from './env';
import { getCatalogue } from './catalogue';
import { createCheckoutSession, getLineItems, getSession, verifyWebhook } from './stripe';
import { processPaidSession, runScheduled } from './orders';
import { adminAction, adminPage, checkAuth } from './admin';
import { handleContact, handleNewsletter } from './forms';
import { corsHeaders, hmacHex, json, safeEqual } from './util';

const MAX_LINES = 30;
const MAX_QTY = 20;

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const cors = corsHeaders(req, env);

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      if (path === '/api/checkout' && req.method === 'POST') return await checkout(req, env, cors);
      if (path === '/api/stripe-webhook' && req.method === 'POST') return await stripeWebhook(req, env, ctx);
      if (path === '/api/order-status' && req.method === 'GET') return await orderStatus(url, env, cors);
      if (path === '/api/download' && req.method === 'GET') return await download(url, env);
      if (path === '/api/contact' && req.method === 'POST') {
        const r = await handleContact(req, env);
        return json(r, r.status, cors);
      }
      if (path === '/api/newsletter' && req.method === 'POST') {
        const r = await handleNewsletter(req, env);
        return json(r, r.status, cors);
      }
      if (path === '/admin' || path.startsWith('/admin/')) {
        const denied = checkAuth(req, env);
        if (denied) return denied;
        if (req.method === 'POST') return await adminAction(req, env, path);
        return await adminPage(req, env);
      }
      if (path === '/') return Response.redirect(env.SITE_URL, 302);
      return json({ error: 'Not found' }, 404, cors);
    } catch (e) {
      console.error(e);
      return json({ error: 'Sorry, something went wrong. Please try again.' }, 500, cors);
    }
  },

  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runScheduled(env));
  },
} satisfies ExportedHandler<Env>;

/** Build a Stripe Checkout Session from the basket, using prices from the published catalogue. */
async function checkout(req: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  const body = (await req.json().catch(() => null)) as { items?: { id: string; variant?: string; qty: number }[] } | null;
  const items = body?.items;
  if (!Array.isArray(items) || !items.length || items.length > MAX_LINES) return json({ error: 'Your basket is empty.' }, 400, cors);

  const catalogue = await getCatalogue(env);
  const lineItems: Record<string, unknown>[] = [];
  let subtotal = 0;
  let physical = false;
  for (const it of items) {
    const p = catalogue.get(String(it.id));
    const qty = Math.floor(Number(it.qty));
    if (!p || !(qty >= 1 && qty <= MAX_QTY)) return json({ error: 'Something in your basket is no longer available. Please remove it and try again.' }, 400, cors);
    const variant = it.variant ? p.variants.find((v) => v.name === it.variant) : undefined;
    if (it.variant && !variant) return json({ error: `The option you chose for ${p.title} is no longer available.` }, 400, cors);
    if (!it.variant && p.variants.length) return json({ error: `Please choose an option for ${p.title}.` }, 400, cors);
    const unit = Math.round((variant?.price ?? p.price) * 100);
    subtotal += unit * qty;
    if (p.fulfilment !== 'digital') physical = true;
    lineItems.push({
      quantity: qty,
      price_data: {
        currency: 'gbp',
        unit_amount: unit,
        product_data: {
          name: variant ? `${p.title} (${variant.name})` : p.title,
          ...(p.image ? { images: [new URL(p.image, env.SITE_URL).toString()] } : {}),
          metadata: { product_id: p.id, variant: variant?.name || '', fulfilment: p.fulfilment },
        },
      },
    });
  }

  const threshold = Number(env.FREE_DELIVERY_THRESHOLD_PENCE || '3000');
  const params: Record<string, unknown> = {
    mode: 'payment',
    currency: 'gbp',
    line_items: lineItems,
    success_url: `${env.SITE_URL}/order-confirmed?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.SITE_URL}/cart`,
    billing_address_collection: 'auto',
    metadata: { source: 'sparklebykimberley.co.uk' },
    custom_text: {
      submit: {
        message: physical
          ? 'By paying you agree to our Terms. Items may arrive in separate parcels. You can cancel physical items within 14 days of delivery.'
          : 'By paying you agree to our Terms and ask us to send your download straight away. You lose the 14-day right to cancel once the download link is sent.',
      },
    },
  };
  if (physical) {
    params.shipping_address_collection = { allowed_countries: ['GB'] };
    params.phone_number_collection = { enabled: true };
    const rate = subtotal >= threshold ? env.STRIPE_SHIPPING_RATE_FREE : env.STRIPE_SHIPPING_RATE_STANDARD;
    if (rate) params.shipping_options = [{ shipping_rate: rate }];
  }
  const session = await createCheckoutSession(env, params);
  return json({ url: session.url }, 200, cors);
}

async function stripeWebhook(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const raw = await req.text();
  const event = await verifyWebhook(raw, req.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET);
  if (!event) return new Response('Invalid signature', { status: 400 });

  const session = event.data.object;
  const paid =
    (event.type === 'checkout.session.completed' && session.payment_status === 'paid') ||
    event.type === 'checkout.session.async_payment_succeeded';
  if (paid) {
    // Reply to Stripe straight away; the supplier work carries on in the background.
    ctx.waitUntil(processPaidSession(env, session).catch((e) => console.error('Order processing failed', e)));
  }
  return json({ received: true });
}

/** Small summary for the order confirmation page. Only reveals a masked email. */
async function orderStatus(url: URL, env: Env, cors: Record<string, string>): Promise<Response> {
  const id = url.searchParams.get('session_id') || '';
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return json({ error: 'Bad request' }, 400, cors);
  const session = await getSession(env, id);
  if (session.payment_status !== 'paid') return json({ error: 'Not paid' }, 404, cors);
  const row = await env.DB.prepare('SELECT id FROM orders WHERE stripe_session_id = ?').bind(id).first<{ id: string }>();
  const items = await getLineItems(env, id);
  const email = session.customer_details?.email || '';
  const masked = email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 6)) + c);
  return json({ reference: row?.id || 'being processed', email: masked, items: items.map((i) => ({ title: i.description, quantity: i.quantity })) }, 200, cors);
}

/** Serve a purchased printable from R2 if the signed link is valid and not expired. */
async function download(url: URL, env: Env): Promise<Response> {
  const k = url.searchParams.get('k') || '';
  const o = url.searchParams.get('o') || '';
  const e = Number(url.searchParams.get('e') || '0');
  const s = url.searchParams.get('s') || '';
  const page = (msg: string, status: number) =>
    new Response(`<!doctype html><meta charset="utf-8"><title>Download</title><body style="font-family:sans-serif;padding:2rem;max-width:560px;margin:auto"><h1>Oops!</h1><p>${msg}</p><p><a href="${env.SITE_URL}/contact">Contact us</a> and we'll send you a fresh link.</p>`, {
      status,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  if (!k || !o || !e || !s) return page('This download link is incomplete.', 400);
  const expected = await hmacHex(env.DOWNLOAD_SIGNING_SECRET, `${k}|${o}|${e}`);
  if (!safeEqual(s, expected)) return page('This download link is not valid.', 403);
  if (Date.now() / 1000 > e) return page('This download link has expired.', 410);
  if (!env.DOWNLOADS) return page('Downloads are not available just now.', 503);
  const obj = await env.DOWNLOADS.get(k);
  if (!obj) return page('We could not find that file.', 404);
  const filename = k.split('/').pop() || 'download';
  return new Response(obj.body, {
    headers: {
      'content-type': obj.httpMetadata?.contentType || 'application/octet-stream',
      'content-disposition': `attachment; filename="${filename.replace(/"/g, '')}"`,
      'cache-control': 'private, no-store',
    },
  });
}
