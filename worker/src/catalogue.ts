import type { Env } from './env';

export type Fulfilment = 'cj' | 'prodigi' | 'digital' | 'manual' | (string & {});

export interface CatalogueProduct {
  id: string;
  title: string;
  price: number; // GBP incl. VAT
  image?: string;
  category: string;
  fulfilment: Fulfilment;
  deliveryEstimate: string;
  supplier: {
    name?: string;
    productId?: string;
    sku?: string;
    variantId?: string;
    url?: string;
    warehouse?: string;
    assetUrl?: string;
    attributes?: Record<string, string>;
    downloadKey?: string;
  };
  variants: { name: string; sku?: string; variantId?: string; price: number }[];
}

let cache: { at: number; products: Map<string, CatalogueProduct> } | null = null;

/** The product list is published by the website at /catalogue.json, so it's always in step with the shop. */
export async function getCatalogue(env: Env): Promise<Map<string, CatalogueProduct>> {
  if (cache && Date.now() - cache.at < 60_000) return cache.products;
  const res = await fetch(`${env.SITE_URL}/catalogue.json`, { cf: { cacheTtl: 60 } });
  if (!res.ok) throw new Error(`Could not load the product catalogue (${res.status})`);
  const data = (await res.json()) as { products: CatalogueProduct[] };
  cache = { at: Date.now(), products: new Map(data.products.map((p) => [p.id, p])) };
  return cache.products;
}

/** Supplier SKU / variant for a product, taking the chosen variant into account. */
export function supplierIds(p: CatalogueProduct, variant?: string | null): { sku: string; variantId: string } {
  const v = variant ? p.variants.find((x) => x.name === variant) : undefined;
  return { sku: v?.sku || p.supplier.sku || '', variantId: v?.variantId || p.supplier.variantId || '' };
}
