import type { Env } from './env';
import { getCatalogue, supplierIds } from './catalogue';
import { getLineItems, shippingOf, type CheckoutSession } from './stripe';
import { adapters } from './suppliers';
import type { Address, LineRow, OrderRow } from './suppliers/types';
import { sendEmail, layout, button } from './email';
import { esc, gbp, errorMessage, orderReference } from './util';

export async function logEvent(env: Env, orderId: string, message: string): Promise<void> {
  await env.DB.prepare('INSERT INTO order_events (order_id, message) VALUES (?, ?)').bind(orderId, message.slice(0, 2000)).run();
}

export function parseAddress(order: OrderRow): Address | null {
  return order.address_json ? (JSON.parse(order.address_json) as Address) : null;
}

/**
 * Save a paid Stripe Checkout Session as an order. Safe to call more than once for the
 * same session (Stripe can resend webhooks): returns null if the order already exists.
 */
export async function recordOrder(env: Env, session: CheckoutSession): Promise<string | null> {
  const existing = await env.DB.prepare('SELECT id FROM orders WHERE stripe_session_id = ?').bind(session.id).first<{ id: string }>();
  if (existing) return null;

  const [items, catalogue] = await Promise.all([getLineItems(env, session.id), getCatalogue(env)]);
  const ship = shippingOf(session);
  const a = ship?.address;
  const address: Address | null = a?.line1
    ? { line1: a.line1, line2: a.line2 || undefined, city: a.city || '', county: a.state || undefined, postcode: a.postal_code || '', country: a.country || 'GB' }
    : null;
  const id = orderReference();
  const cd = session.customer_details || {};

  const stmts: D1PreparedStatement[] = [
    env.DB.prepare(
      `INSERT INTO orders (id, stripe_session_id, payment_intent, email, name, phone, address_json, subtotal_pence, shipping_pence, total_pence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id,
      session.id,
      session.payment_intent || null,
      cd.email || '',
      ship?.name || cd.name || null,
      cd.phone || null,
      address ? JSON.stringify(address) : null,
      session.amount_subtotal,
      session.shipping_cost?.amount_total || 0,
      session.amount_total,
    ),
  ];
  for (const li of items) {
    const meta = li.price.product.metadata || {};
    const product = catalogue.get(meta.product_id);
    const fulfilment = product?.fulfilment || meta.fulfilment || 'manual';
    const ids = product ? supplierIds(product, meta.variant) : { sku: '', variantId: '' };
    stmts.push(
      env.DB.prepare(
        `INSERT INTO order_lines (order_id, product_id, title, variant, quantity, unit_price_pence, fulfilment, supplier_sku, supplier_variant_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(id, meta.product_id || 'unknown', product?.title || li.description, meta.variant || null, li.quantity, li.price.unit_amount, fulfilment, ids.sku || null, ids.variantId || null),
    );
  }
  stmts.push(env.DB.prepare('INSERT INTO order_events (order_id, message) VALUES (?, ?)').bind(id, `Order paid: ${gbp(session.amount_total)} (${session.id})`));
  try {
    await env.DB.batch(stmts);
  } catch (e) {
    // A duplicate webhook delivered at the same moment loses the race on the UNIQUE session id.
    if (/UNIQUE/i.test(errorMessage(e))) return null;
    throw e;
  }
  return id;
}

async function loadOrder(env: Env, orderId: string) {
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first<OrderRow>();
  if (!order) throw new Error(`Order ${orderId} not found`);
  const { results } = await env.DB.prepare('SELECT * FROM order_lines WHERE order_id = ? ORDER BY id').bind(orderId).all<LineRow>();
  return { order, lines: results };
}

/**
 * Send every unsent line of an order to its supplier, grouped by fulfilment type.
 * Pass `only` to retry a single supplier group. Failures are recorded, never thrown.
 */
export async function dispatchOrder(env: Env, orderId: string, only?: string): Promise<{ failed: string[] }> {
  const { order, lines } = await loadOrder(env, orderId);
  const products = await getCatalogue(env);
  const address = parseAddress(order);
  const todo = lines.filter((l) => (l.status === 'pending' || l.status === 'failed') && (!only || l.fulfilment === only));
  const groups = new Map<string, LineRow[]>();
  for (const l of todo) groups.set(l.fulfilment, [...(groups.get(l.fulfilment) || []), l]);

  const failed: string[] = [];
  for (const [fulfilment, group] of groups) {
    const adapter = adapters[fulfilment];
    const ids = group.map((l) => l.id);
    try {
      if (!adapter) throw new Error(`No supplier adapter called "${fulfilment}"`);
      const results = await adapter.submit({ env, order, address, lines: group, products });
      for (const r of results) {
        const target = r.lineIds ?? ids;
        await env.DB.prepare(
          `UPDATE order_lines SET status = ?, supplier_order_id = COALESCE(?, supplier_order_id), error = NULL, attempts = attempts + 1, updated_at = datetime('now')
           WHERE id IN (${target.map(() => '?').join(',')})`,
        )
          .bind(r.status, r.supplierOrderId ?? null, ...target)
          .run();
        await logEvent(env, orderId, `${adapter.label}: ${r.note || r.status}`);
      }
    } catch (e) {
      const msg = errorMessage(e);
      failed.push(`${fulfilment}: ${msg}`);
      await env.DB.prepare(
        `UPDATE order_lines SET status = 'failed', error = ?, attempts = attempts + 1, updated_at = datetime('now') WHERE id IN (${ids.map(() => '?').join(',')})`,
      )
        .bind(msg.slice(0, 1000), ...ids)
        .run();
      await logEvent(env, orderId, `FAILED ${fulfilment}: ${msg}`);
    }
  }
  if (failed.length) await alertOwner(env, orderId, failed);
  return { failed };
}

async function alertOwner(env: Env, orderId: string, failed: string[]) {
  try {
    await sendEmail(env, {
      to: env.OWNER_EMAIL,
      subject: `⚠️ Supplier problem with order ${orderId}`,
      html: layout(
        env,
        `Order ${orderId} needs a look`,
        `<p>Something went wrong sending part of this order to a supplier:</p><ul>${failed.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
        <p>The system will try again automatically a couple of times. You can also fix the problem and press <strong>Retry</strong> on the admin page.</p>
        ${button(`${env.API_URL}/admin?status=failed`, 'Open the orders admin')}`,
      ),
    });
  } catch (e) {
    console.error('Could not email owner about failure', e);
  }
}

/** Thank-you email to the customer, plus a heads-up to the owner. Sent once per order. */
export async function sendConfirmation(env: Env, orderId: string): Promise<void> {
  const { order, lines } = await loadOrder(env, orderId);
  if (order.confirmation_sent) return;
  const products = await getCatalogue(env);
  const first = order.name ? ` ${order.name.split(' ')[0]}` : '';
  const rows = lines
    .map((l) => {
      const p = products.get(l.product_id);
      const when = l.fulfilment === 'digital' ? 'Download link in a separate email' : `Estimated delivery: ${p?.deliveryEstimate || 'see website'}`;
      return `<tr><td style="padding:8px 0;border-bottom:1px dashed #ccc">${l.quantity} × <strong>${esc(l.title)}</strong>${l.variant ? ` (${esc(l.variant)})` : ''}<br><span style="color:#5a5555;font-size:14px">${esc(when)}</span></td><td align="right" style="padding:8px 0;border-bottom:1px dashed #ccc">${gbp(l.unit_price_pence * l.quantity)}</td></tr>`;
    })
    .join('');
  const physical = lines.some((l) => l.fulfilment !== 'digital');
  const addr = parseAddress(order);
  await sendEmail(env, {
    to: order.email,
    replyTo: env.OWNER_EMAIL,
    subject: `Thank you for your order! (${order.id})`,
    html: layout(
      env,
      `Thank you${first}! Your order is confirmed ✨`,
      `<p>Your order reference is <strong>${esc(order.id)}</strong>.</p>
      <table style="width:100%;border-collapse:collapse">${rows}
      <tr><td style="padding:6px 0">Delivery</td><td align="right">${order.shipping_pence ? gbp(order.shipping_pence) : physical ? 'Free' : '-'}</td></tr>
      <tr><td style="padding:6px 0"><strong>Total paid</strong></td><td align="right"><strong>${gbp(order.total_pence)}</strong></td></tr></table>
      ${addr ? `<p><strong>Delivering to:</strong><br>${[order.name, addr.line1, addr.line2, addr.city, addr.postcode].filter(Boolean).map(esc).join('<br>')}</p>` : ''}
      ${physical ? `<p>Some items are sent from different places, so they may arrive in separate parcels. We'll email your tracking number as soon as each one ships.</p>` : ''}
      <p>Changed your mind? You have 14 days from delivery to cancel physical items. See our <a href="${env.SITE_URL}/returns">returns policy</a>.</p>
      ${button(`${env.SITE_URL}/tutorials`, 'Find something to make')}`,
    ),
  });
  await env.DB.prepare('UPDATE orders SET confirmation_sent = 1, updated_at = datetime(\'now\') WHERE id = ?').bind(orderId).run();
  try {
    await sendEmail(env, {
      to: env.OWNER_EMAIL,
      subject: `🎉 New order ${order.id}: ${gbp(order.total_pence)}`,
      html: layout(env, `New order ${order.id}`, `<table style="width:100%">${rows}</table>${button(`${env.API_URL}/admin`, 'View in admin')}`),
    });
  } catch (e) {
    console.error('Owner new-order email failed', e);
  }
}

/** Full webhook flow: save the order, send it to suppliers, then email the customer. */
export async function processPaidSession(env: Env, session: CheckoutSession): Promise<void> {
  const orderId = await recordOrder(env, session);
  if (!orderId) return; // already handled
  await dispatchOrder(env, orderId);
  try {
    await sendConfirmation(env, orderId);
  } catch (e) {
    await logEvent(env, orderId, `Confirmation email failed: ${errorMessage(e)}`);
  }
}

/** Email the customer their tracking details. */
async function notifyShipped(env: Env, order: OrderRow, lines: LineRow[], tracking: { number?: string; url?: string; carrier?: string }) {
  const first = order.name ? ` ${order.name.split(' ')[0]}` : '';
  await sendEmail(env, {
    to: order.email,
    replyTo: env.OWNER_EMAIL,
    subject: `Your Sparkle parcel is on its way! (${order.id})`,
    html: layout(
      env,
      `Good news${first}, it's on its way! 📦`,
      `<p>These items from order <strong>${esc(order.id)}</strong> have been sent:</p>
      <ul>${lines.map((l) => `<li>${l.quantity} × ${esc(l.title)}</li>`).join('')}</ul>
      ${tracking.number ? `<p><strong>Tracking number:</strong> ${esc(tracking.number)}${tracking.carrier ? ` (${esc(tracking.carrier)})` : ''}</p>` : ''}
      ${tracking.url ? button(tracking.url, 'Track your parcel') : ''}
      <p>Tracking can take a day or so to start showing updates. Happy crafting!</p>`,
    ),
  });
}

/** Owner marks a manual line as shipped from the admin page. */
export async function markShipped(env: Env, lineId: number, trackingNumber: string, carrier: string, trackingUrl: string): Promise<void> {
  const line = await env.DB.prepare('SELECT * FROM order_lines WHERE id = ?').bind(lineId).first<LineRow>();
  if (!line) throw new Error('Line not found');
  const order = (await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(line.order_id).first<OrderRow>())!;
  await env.DB.prepare(
    `UPDATE order_lines SET status = 'shipped', tracking_number = ?, carrier = ?, tracking_url = ?, error = NULL, customer_notified = 1, updated_at = datetime('now') WHERE id = ?`,
  )
    .bind(trackingNumber || null, carrier || null, trackingUrl || null, lineId)
    .run();
  await notifyShipped(env, order, [line], { number: trackingNumber, url: trackingUrl, carrier });
  await logEvent(env, order.id, `Marked shipped by owner: ${line.title} ${trackingNumber || ''}`.trim());
}

/** Scheduled job: ask suppliers for tracking, email customers, and retry recent failures. */
export async function runScheduled(env: Env): Promise<void> {
  const { results: open } = await env.DB.prepare(
    `SELECT * FROM order_lines WHERE status = 'submitted' AND supplier_order_id IS NOT NULL ORDER BY id LIMIT 200`,
  ).all<LineRow>();

  const bySupplierOrder = new Map<string, LineRow[]>();
  for (const l of open) {
    const key = `${l.fulfilment}|${l.supplier_order_id}`;
    bySupplierOrder.set(key, [...(bySupplierOrder.get(key) || []), l]);
  }
  for (const [key, lines] of bySupplierOrder) {
    const [fulfilment, supplierOrderId] = key.split('|');
    const adapter = adapters[fulfilment];
    if (!adapter?.checkStatus) continue;
    try {
      const st = await adapter.checkStatus(env, supplierOrderId);
      if (!st || st.state === 'processing') continue;
      const ids = lines.map((l) => l.id);
      const placeholders = ids.map(() => '?').join(',');
      if (st.state === 'cancelled') {
        await env.DB.prepare(`UPDATE order_lines SET status = 'cancelled', error = 'Cancelled by supplier', updated_at = datetime('now') WHERE id IN (${placeholders})`).bind(...ids).run();
        await logEvent(env, lines[0].order_id, `${adapter.label} order ${supplierOrderId} was cancelled by the supplier`);
        await alertOwner(env, lines[0].order_id, [`${adapter.label} cancelled order ${supplierOrderId}`]);
        continue;
      }
      await env.DB.prepare(
        `UPDATE order_lines SET status = ?, tracking_number = ?, tracking_url = ?, carrier = ?, updated_at = datetime('now') WHERE id IN (${placeholders})`,
      )
        .bind(st.state, st.trackingNumber || null, st.trackingUrl || null, st.carrier || null, ...ids)
        .run();
      const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(lines[0].order_id).first<OrderRow>();
      if (order && lines.some((l) => !l.customer_notified)) {
        await notifyShipped(env, order, lines, { number: st.trackingNumber, url: st.trackingUrl, carrier: st.carrier });
        await env.DB.prepare(`UPDATE order_lines SET customer_notified = 1 WHERE id IN (${placeholders})`).bind(...ids).run();
      }
      await logEvent(env, lines[0].order_id, `${adapter.label} order ${supplierOrderId} ${st.state}${st.trackingNumber ? `: ${st.trackingNumber}` : ''}`);
    } catch (e) {
      console.error(`Status check failed for ${key}`, e);
    }
  }

  // Automatically retry failed submissions a couple of times (at most once per run).
  const { results: retry } = await env.DB.prepare(
    `SELECT DISTINCT order_id, fulfilment FROM order_lines WHERE status = 'failed' AND attempts < 3 AND updated_at < datetime('now', '-30 minutes') LIMIT 20`,
  ).all<{ order_id: string; fulfilment: string }>();
  for (const r of retry) await dispatchOrder(env, r.order_id, r.fulfilment);
}
