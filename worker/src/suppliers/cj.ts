import type { Env } from '../env';
import { supplierIds } from '../catalogue';
import type { SupplierAdapter, SubmitResult, ShipmentStatus } from './types';

/** CJdropshipping open API v2: https://developers.cjdropshipping.com */
const API = 'https://developers.cjdropshipping.com/api2.0/v1';

interface CJResponse<T> {
  code: number;
  result: boolean;
  message: string;
  data: T;
}

async function getToken(env: Env): Promise<string> {
  if (!env.CJ_API_KEY) throw new Error('CJ_API_KEY secret is not set');
  const row = await env.DB.prepare('SELECT value, expires_at FROM kv WHERE key = ?').bind('cj_token').first<{ value: string; expires_at: number }>();
  if (row && row.expires_at > Date.now()) return row.value;
  const res = await fetch(`${API}/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ apiKey: env.CJ_API_KEY }),
  });
  const data = (await res.json()) as CJResponse<{ accessToken: string; accessTokenExpiryDate?: string }>;
  if (!data.result || !data.data?.accessToken) throw new Error(`CJ login failed: ${data.message}`);
  // Tokens last about 15 days; refresh a day early.
  const expiry = data.data.accessTokenExpiryDate ? Date.parse(data.data.accessTokenExpiryDate) : Date.now() + 14 * 86400_000;
  const expiresAt = (Number.isFinite(expiry) ? expiry : Date.now() + 14 * 86400_000) - 86400_000;
  await env.DB.prepare('INSERT OR REPLACE INTO kv (key, value, expires_at) VALUES (?, ?, ?)').bind('cj_token', data.data.accessToken, expiresAt).run();
  return data.data.accessToken;
}

export async function cjFetch<T>(env: Env, path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = await getToken(env);
  const res = await fetch(`${API}${path}`, {
    method: init.method || 'GET',
    headers: { 'CJ-Access-Token': token, 'content-type': 'application/json' },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const data = (await res.json()) as CJResponse<T>;
  if (!data.result) throw new Error(`CJ ${path}: ${data.message || res.status}`);
  return data.data;
}

/** Pick the cheapest shipping method CJ offers from this warehouse to the UK. */
async function chooseLogistic(env: Env, from: string, products: { vid: string; quantity: number }[]): Promise<string | null> {
  if (env.CJ_LOGISTIC_NAME) return env.CJ_LOGISTIC_NAME;
  try {
    const options = await cjFetch<{ logisticName: string; logisticPrice: number }[]>(env, '/logistic/freightCalculate', {
      method: 'POST',
      body: { startCountryCode: from, endCountryCode: 'GB', products },
    });
    if (!options?.length) return null;
    return [...options].sort((a, b) => a.logisticPrice - b.logisticPrice)[0].logisticName;
  } catch {
    return null;
  }
}

export const cj: SupplierAdapter = {
  id: 'cj',
  label: 'CJdropshipping',

  async submit({ env, order, address, lines, products }) {
    if (!address) throw new Error('No delivery address on this order');
    await getToken(env); // fail early with a clear message if the API key is missing or wrong
    // Group lines by the warehouse they ship from (each warehouse is a separate CJ order).
    const groups = new Map<string, typeof lines>();
    for (const l of lines) {
      const p = products.get(l.product_id);
      const wh = (p?.supplier.warehouse || env.CJ_FROM_COUNTRY || 'CN').toUpperCase();
      groups.set(wh, [...(groups.get(wh) || []), l]);
    }
    const results: SubmitResult[] = [];
    for (const [warehouse, group] of groups) {
      const items = group.map((l) => {
        const vid = l.supplier_variant_id || supplierIds(products.get(l.product_id)!, l.variant).variantId;
        if (!vid) throw new Error(`No CJ variant ID for "${l.title}". Add it to the product file.`);
        return { vid, quantity: l.quantity };
      });
      let from = warehouse;
      let logisticName = await chooseLogistic(env, from, items);
      if (!logisticName && env.CJ_FALLBACK_COUNTRY && env.CJ_FALLBACK_COUNTRY !== from) {
        from = env.CJ_FALLBACK_COUNTRY;
        logisticName = await chooseLogistic(env, from, items);
      }
      if (!logisticName) throw new Error(`CJ has no shipping method from ${warehouse} to the UK for these items`);
      const created = await cjFetch<{ orderId: string } | string>(env, '/shopping/order/createOrderV2', {
        method: 'POST',
        body: {
          orderNumber: groups.size > 1 ? `${order.id}-${warehouse}` : order.id,
          shippingCountryCode: 'GB',
          shippingCountry: 'United Kingdom',
          shippingProvince: address.county || address.city,
          shippingCity: address.city,
          shippingAddress: address.line1,
          shippingAddress2: address.line2 || '',
          shippingZip: address.postcode,
          shippingCustomerName: order.name || 'Customer',
          shippingPhone: order.phone || '',
          email: order.email,
          remark: `Sparkle by Kimberley order ${order.id}`,
          fromCountryCode: from,
          logisticName,
          products: items,
        },
      });
      const supplierOrderId = typeof created === 'string' ? created : created?.orderId;
      if (!supplierOrderId) throw new Error('CJ did not return an order ID');
      results.push({
        lineIds: group.map((l) => l.id),
        supplierOrderId,
        status: 'submitted',
        note: `CJ order ${supplierOrderId} created from ${from} via ${logisticName}. Remember CJ orders must be paid from your CJ balance.`,
      });
    }
    return results;
  },

  async checkStatus(env, supplierOrderId): Promise<ShipmentStatus | null> {
    const d = await cjFetch<{ orderStatus: string; trackNumber?: string; logisticName?: string } | null>(
      env,
      `/shopping/order/getOrderDetail?orderId=${encodeURIComponent(supplierOrderId)}`,
    );
    if (!d) return null;
    const s = (d.orderStatus || '').toUpperCase();
    if (s === 'CANCELLED') return { state: 'cancelled' };
    if (d.trackNumber || s === 'SHIPPED' || s === 'DELIVERED') {
      return {
        state: s === 'DELIVERED' ? 'delivered' : 'shipped',
        trackingNumber: d.trackNumber,
        trackingUrl: d.trackNumber ? `https://t.17track.net/en#nums=${encodeURIComponent(d.trackNumber)}` : undefined,
        carrier: d.logisticName,
      };
    }
    return { state: 'processing' };
  },
};
