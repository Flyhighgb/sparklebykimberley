import type { Env } from '../env';
import type { CatalogueProduct } from '../catalogue';

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string; // ISO code, always GB for this shop
}

export interface OrderRow {
  id: string;
  stripe_session_id: string;
  email: string;
  name: string | null;
  phone: string | null;
  address_json: string | null;
  subtotal_pence: number;
  shipping_pence: number;
  total_pence: number;
  confirmation_sent: number;
  created_at: string;
}

export interface LineRow {
  id: number;
  order_id: string;
  product_id: string;
  title: string;
  variant: string | null;
  quantity: number;
  unit_price_pence: number;
  fulfilment: string;
  supplier_sku: string | null;
  supplier_variant_id: string | null;
  supplier_order_id: string | null;
  status: string;
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
  error: string | null;
  attempts: number;
  customer_notified: number;
}

export interface SubmitContext {
  env: Env;
  order: OrderRow;
  address: Address | null;
  /** The lines in this order that belong to this supplier and still need sending. */
  lines: LineRow[];
  products: Map<string, CatalogueProduct>;
}

export interface SubmitResult {
  /** Which lines this result applies to (defaults to all lines passed in). */
  lineIds?: number[];
  /** The supplier's own order number, used later to check for tracking. */
  supplierOrderId?: string;
  /** submitted = waiting for the supplier to ship; fulfilled = nothing more to do; awaiting_owner = owner must act. */
  status: 'submitted' | 'fulfilled' | 'awaiting_owner';
  note?: string;
}

export interface ShipmentStatus {
  state: 'processing' | 'shipped' | 'delivered' | 'cancelled';
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
}

/**
 * A supplier adapter knows how to send order lines to one supplier and,
 * optionally, how to ask that supplier whether the parcel has shipped.
 */
export interface SupplierAdapter {
  /** Must match the product's "fulfilment" value, e.g. "cj". */
  id: string;
  label: string;
  /** Send the lines to the supplier. Throw an Error if it fails; the order is then marked "failed" and can be retried. */
  submit(ctx: SubmitContext): Promise<SubmitResult[]>;
  /** Ask the supplier for the latest status of one of their orders. */
  checkStatus?(env: Env, supplierOrderId: string): Promise<ShipmentStatus | null>;
}
