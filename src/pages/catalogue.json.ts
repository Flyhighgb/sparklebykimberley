import type { APIRoute } from 'astro';
import { getProducts } from '../lib/content';

/**
 * Product catalogue read by the order Worker, so prices and supplier details always come
 * from the published site and never from the shopper's browser. Cost prices are left out.
 */
export const GET: APIRoute = async () => {
  const products = await getProducts();
  const catalogue = products.map((p) => {
    const d = p.data;
    return {
      id: p.id,
      title: d.title,
      price: d.price,
      image: d.images[0]?.src,
      category: d.category,
      fulfilment: d.fulfilment,
      deliveryEstimate: d.deliveryEstimate,
      supplier: d.supplier,
      variants: d.variants.map((v) => ({ name: v.name, sku: v.sku, variantId: v.variantId, price: v.price ?? d.price })),
    };
  });
  return new Response(JSON.stringify({ generated: new Date().toISOString(), products: catalogue }), {
    headers: { 'content-type': 'application/json' },
  });
};
