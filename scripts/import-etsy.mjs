// Pulls the live listings from the Etsy shop named in src/data/settings.json ("etsyShop") and
// writes one product file each to src/content/products/etsy/, so the shop shows Etsy's photos,
// prices and descriptions with a "Buy on Etsy" button. Runs before every build.
//
// Needs an Etsy API key in the ETSY_API_KEY environment variable (a GitHub secret), plus
// ETSY_SHARED_SECRET if your Etsy app has one. Without a key it does nothing.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = 'src/content/products/etsy';
const API = 'https://openapi.etsy.com/v3/application';

const settings = JSON.parse(await readFile('src/data/settings.json', 'utf8'));
const shopName = (settings.etsyShop || '').trim();
const key = (process.env.ETSY_API_KEY || '').trim();
const secret = (process.env.ETSY_SHARED_SECRET || '').trim();

if (!shopName || !key) {
  console.log(shopName ? 'Skipping Etsy import (no ETSY_API_KEY secret yet).' : 'Skipping Etsy import (no etsyShop in settings).');
  process.exit(0);
}

/** Etsy keys issued with a shared secret are sent as "keystring:secret". */
const apiKey = key.includes(':') || !secret ? key : `${key}:${secret}`;

class AccessError extends Error {}

async function etsy(path) {
  const res = await fetch(API + path, { headers: { 'x-api-key': apiKey, accept: 'application/json' } });
  const text = await res.text();
  if (res.status === 401 || res.status === 403) throw new AccessError(`Etsy refused the API key (${res.status}): ${text.slice(0, 200)}`);
  if (!res.ok) throw new Error(`Etsy API ${path} failed (${res.status}): ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function decode(s = '') {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

/** Etsy descriptions are plain text; escape anything Markdown or HTML would treat specially. */
function toMarkdown(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[<>]/g, (c) => (c === '<' ? '&lt;' : '&gt;'))
    .replace(/^(\s*)[•●▪◦]\s*/gm, '$1- ')
    .split(/\n{2,}/)
    .map((para) => para.split('\n').join('  \n'))
    .join('\n\n');
}

function summarise(text, title) {
  const first = text.split(/\n/).map((l) => l.trim()).find((l) => l.length > 20) || title;
  return first.length > 160 ? first.slice(0, 157).replace(/\s+\S*$/, '') + '…' : first;
}

function slug(s) {
  return s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60).replace(/-$/, '');
}

try {
  const shops = await etsy(`/shops?shop_name=${encodeURIComponent(shopName)}`);
  const shop = shops.results?.find((s) => s.shop_name.toLowerCase() === shopName.toLowerCase()) || shops.results?.[0];
  if (!shop) throw new Error(`Etsy has no shop called "${shopName}".`);

  const sections = new Map();
  try {
    for (const s of (await etsy(`/shops/${shop.shop_id}/sections`)).results || []) sections.set(s.shop_section_id, decode(s.title));
  } catch (e) {
    if (e instanceof AccessError) throw e;
    console.log(`::warning::Couldn't read the Etsy shop sections, so everything goes under "Shop": ${e.message}`);
  }

  // Active listings, 100 at a time, then their photos in batches.
  const listings = [];
  for (let offset = 0; ; offset += 100) {
    const page = await etsy(`/shops/${shop.shop_id}/listings/active?limit=100&offset=${offset}`);
    listings.push(...(page.results || []));
    if (!page.results?.length || listings.length >= page.count) break;
  }
  const images = new Map();
  for (let i = 0; i < listings.length; i += 100) {
    const ids = listings.slice(i, i + 100).map((l) => l.listing_id).join(',');
    const batch = await etsy(`/listings/batch?listing_ids=${ids}&includes=Images`);
    for (const l of batch.results || []) images.set(l.listing_id, l.images || []);
  }

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  const used = new Set();
  let written = 0;
  for (const l of listings) {
    const title = decode(l.title).trim();
    const pics = (images.get(l.listing_id) || [])
      .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
      .map((im) => ({ src: im.url_fullxfull || im.url_570xN, alt: decode(im.alt_text || '') || title }))
      .filter((im) => im.src);
    if (!pics.length || !l.price?.amount) continue;
    const description = decode(l.description || '').trim();
    let id = slug(title) || `listing-${l.listing_id}`;
    if (used.has(id)) id = `${id}-${l.listing_id}`;
    used.add(id);
    const product = {
      title,
      summary: summarise(description, title),
      description: toMarkdown(description || title),
      category: sections.get(l.shop_section_id) || 'Shop',
      price: l.price.amount / l.price.divisor,
      fulfilment: 'etsy',
      etsyUrl: (l.url || `https://www.etsy.com/uk/listing/${l.listing_id}`).split('?')[0],
      images: pics.slice(0, 6),
      featured: typeof l.featured_rank === 'number' && l.featured_rank >= 0,
    };
    await writeFile(join(OUT, `${id}.json`), JSON.stringify(product, null, 2) + '\n');
    written++;
  }
  console.log(`✔ Imported ${written} listings from Etsy shop ${shop.shop_name}`);
} catch (e) {
  if (e instanceof AccessError) {
    // A key that isn't approved yet shouldn't block the rest of the site from deploying.
    console.log(`::warning::${e.message}. The shop will show "coming soon" until the Etsy key works.`);
    process.exit(0);
  }
  // Anything else (Etsy down, network trouble): stop, so the live site keeps its current products.
  console.error(`Etsy import failed: ${e.message}`);
  process.exit(1);
}
