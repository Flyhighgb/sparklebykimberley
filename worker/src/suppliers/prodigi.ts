import type { Env } from '../env';
import type { SupplierAdapter, ShipmentStatus } from './types';

/** Prodigi print-on-demand API v4: https://www.prodigi.com/print-api/docs/reference/ */
function base(env: Env) {
  return env.PRODIGI_ENV === 'live' ? 'https://api.prodigi.com/v4.0' : 'https://api.sandbox.prodigi.com/v4.0';
}

async function prodigiFetch<T>(env: Env, path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  if (!env.PRODIGI_API_KEY) throw new Error('PRODIGI_API_KEY secret is not set');
  const res = await fetch(`${base(env)}${path}`, {
    method: init.method || 'GET',
    headers: { 'X-API-Key': env.PRODIGI_API_KEY, 'content-type': 'application/json' },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as T & { outcome?: string; failures?: unknown };
  if (!res.ok) throw new Error(`Prodigi ${path}: ${res.status} ${data.outcome || ''} ${JSON.stringify(data.failures || '')}`.trim());
  return data;
}

interface ProdigiOrder {
  id: string;
  status: { stage: 'InProgress' | 'Complete' | 'Cancelled' | string };
  shipments?: { carrier?: { name?: string }; tracking?: { number?: string; url?: string } }[];
}

export const prodigi: SupplierAdapter = {
  id: 'prodigi',
  label: 'Prodigi',

  async submit({ env, order, address, lines, products }) {
    if (!address) throw new Error('No delivery address on this order');
    const items = lines.map((l) => {
      const p = products.get(l.product_id);
      const sku = l.supplier_sku || p?.supplier.sku;
      const asset = p?.supplier.assetUrl;
      if (!sku || sku.startsWith('REPLACE')) throw new Error(`No Prodigi SKU for "${l.title}". Add it to the product file.`);
      if (!asset) throw new Error(`No print artwork URL (assetUrl) for "${l.title}"`);
      return {
        merchantReference: `${order.id}-${l.id}`,
        sku,
        copies: l.quantity,
        sizing: 'fillPrintArea',
        attributes: p?.supplier.attributes || {},
        assets: [{ printArea: 'default', url: asset }],
      };
    });
    const r = await prodigiFetch<{ outcome: string; order: ProdigiOrder }>(env, '/Orders', {
      method: 'POST',
      body: {
        merchantReference: order.id,
        idempotencyKey: `${order.id}-prodigi`,
        shippingMethod: 'Standard',
        recipient: {
          name: order.name || 'Customer',
          email: order.email,
          phoneNumber: order.phone || undefined,
          address: {
            line1: address.line1,
            line2: address.line2 || undefined,
            postalOrZipCode: address.postcode,
            countryCode: address.country || 'GB',
            townOrCity: address.city,
            stateOrCounty: address.county || undefined,
          },
        },
        items,
      },
    });
    if (!r.order?.id) throw new Error(`Prodigi did not create the order (${r.outcome})`);
    return [{ supplierOrderId: r.order.id, status: 'submitted', note: `Prodigi order ${r.order.id} (${r.outcome}, ${env.PRODIGI_ENV || 'sandbox'})` }];
  },

  async checkStatus(env, supplierOrderId): Promise<ShipmentStatus | null> {
    const { order } = await prodigiFetch<{ order: ProdigiOrder }>(env, `/Orders/${encodeURIComponent(supplierOrderId)}`);
    if (!order) return null;
    if (order.status.stage === 'Cancelled') return { state: 'cancelled' };
    const shipment = order.shipments?.find((s) => s.tracking?.number);
    if (shipment) {
      return {
        state: 'shipped',
        trackingNumber: shipment.tracking!.number,
        trackingUrl: shipment.tracking!.url,
        carrier: shipment.carrier?.name,
      };
    }
    return { state: 'processing' };
  },
};
