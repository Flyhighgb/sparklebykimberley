#!/usr/bin/env node
/**
 * Import products from CJdropshipping into the shop.
 *
 *   npm run import:cj -- --search "quilling kit"          list matching CJ products
 *   npm run import:cj -- --id 1234567890ABCDEF             import one product (by CJ product ID)
 *   npm run import:cj -- --id 1234... --category "Craft Kits (Kids)" --markup 3
 *
 * New products are saved as DRAFTS in src/content/products so you can check the words,
 * photos and safety info before they appear in the shop. Settings live in scripts/import.config.json.
 * Needs CJ_API_KEY in your .env file (CJ dashboard > Authorization > API).
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const API = 'https://developers.cjdropshipping.com/api2.0/v1';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/import.config.json'), 'utf8'));
const CATEGORIES = ['Card & Paper', 'Craft Kits (Adults)', 'Craft Kits (Kids)', 'Tools & Adhesives', 'Embellishments', 'Printable Downloads', 'Sparkle Merch', 'Gift Sets'];

// ---- tiny helpers -------------------------------------------------------------------------
function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
function args() {
  const out = {};
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) out[a[i].slice(2)] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true;
  return out;
}
const slugify = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60).replace(/-$/, '');
const stripHtml = (s = '') => s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
const fail = (msg) => {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
};

/** Retail price: cost × markup, rounded UP to the next .99 (e.g. 7.20 → 7.99). */
export function retailPrice(costGbp, markup = config.markup, roundTo = config.roundTo) {
  const raw = costGbp * markup;
  let price = Math.floor(raw) + roundTo;
  if (price < raw) price += 1;
  return Math.round(price * 100) / 100;
}

// ---- CJ API -------------------------------------------------------------------------------
async function token() {
  const cache = path.join(ROOT, '.cj-token.json');
  if (fs.existsSync(cache)) {
    const t = JSON.parse(fs.readFileSync(cache, 'utf8'));
    if (t.expires > Date.now()) return t.token;
  }
  if (!process.env.CJ_API_KEY) fail('CJ_API_KEY is missing. Add it to the .env file in the project folder.');
  const res = await fetch(`${API}/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ apiKey: process.env.CJ_API_KEY }),
  });
  const data = await res.json();
  if (!data.result) fail(`CJ login failed: ${data.message}`);
  fs.writeFileSync(cache, JSON.stringify({ token: data.data.accessToken, expires: Date.now() + 13 * 86400_000 }));
  return data.data.accessToken;
}
async function cj(pathname, { method = 'GET', body } = {}) {
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers: { 'CJ-Access-Token': await token(), 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.result) throw new Error(`CJ ${pathname}: ${data.message}`);
  return data.data;
}

async function usdToGbp() {
  if (typeof config.usdToGbp === 'number') return config.usdToGbp;
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=GBP');
    const j = await r.json();
    if (j?.rates?.GBP) return j.rates.GBP;
  } catch {}
  return config.usdToGbpFallback;
}

/** Cheapest shipping to the UK, trying the preferred (EU) warehouse first. */
async function cheapestShipping(vid) {
  for (const from of [config.preferWarehouse, config.fallbackWarehouse].filter(Boolean)) {
    try {
      const options = await cj('/logistic/freightCalculate', { method: 'POST', body: { startCountryCode: from, endCountryCode: 'GB', products: [{ quantity: 1, vid }] } });
      if (options?.length) {
        const best = [...options].sort((a, b) => a.logisticPrice - b.logisticPrice)[0];
        const [min, max] = String(best.logisticAging || '7-15').split('-').map((n) => parseInt(n, 10));
        return { from, name: best.logisticName, usd: Number(best.logisticPrice) || 0, min: min || 7, max: max || min || 15 };
      }
    } catch {}
  }
  return null;
}

function images(p) {
  let list = p.productImageSet ?? p.productImage ?? [];
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      list = list.split(',');
    }
  }
  return [...new Set([].concat(list).map((s) => String(s).trim()).filter((s) => /^https?:/.test(s)))];
}

async function saveImage(url, file) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`image ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await sharp(buf).rotate().resize({ width: 1200, height: 900, fit: 'contain', background: '#ffffff' }).flatten({ background: '#ffffff' }).jpeg({ quality: 80, mozjpeg: true }).toFile(file);
}

// ---- commands -----------------------------------------------------------------------------
async function search(term) {
  const data = await cj(`/product/list?pageNum=1&pageSize=20&productNameEn=${encodeURIComponent(term)}`);
  const list = data?.list || [];
  if (!list.length) return console.log('No products found. Try a different search.');
  console.log(`\nTop ${list.length} CJ products for "${term}":\n`);
  for (const p of list) console.log(`  ${p.pid}  $${p.sellPrice}  ${p.productNameEn}`);
  console.log('\nImport one with: npm run import:cj -- --id <the ID on the left>\n');
}

async function importProduct(pid, opts) {
  const markup = Number(opts.markup || config.markup);
  const category = opts.category || config.defaultCategory;
  if (!CATEGORIES.includes(category)) fail(`Category must be one of: ${CATEGORIES.join(', ')}`);

  console.log(`Fetching CJ product ${pid}…`);
  const p = await cj(`/product/query?pid=${encodeURIComponent(pid)}`);
  if (!p) fail('Product not found.');
  const variants = p.variants || [];
  if (!variants.length) fail('This product has no variants to sell.');

  const rate = await usdToGbp();
  const ship = await cheapestShipping(variants[0].vid);
  if (!ship) console.warn('⚠ CJ could not quote UK shipping for this product. Check it in the CJ dashboard before selling.');
  const shipUsd = config.includeShippingInCost && ship ? ship.usd : 0;
  const [pMin, pMax] = config.processingDays;
  const deliveryEstimate = ship ? `${ship.min + pMin} to ${ship.max + pMax} working days` : '7 to 15 working days';

  const priced = variants.map((v) => {
    const costGbp = Math.round((Number(v.variantSellPrice || p.sellPrice) + shipUsd) * rate * 100) / 100;
    return { name: v.variantNameEn || v.variantKey || v.variantSku, sku: v.variantSku || '', variantId: v.vid, cost: costGbp, price: retailPrice(costGbp, markup) };
  });
  const base = priced[0];
  const title = String(p.productNameEn || 'New product').replace(/\s+/g, ' ').trim();
  let slug = slugify(title);
  const outDir = path.join(ROOT, 'src/content/products');
  if (fs.existsSync(path.join(outDir, `${slug}.json`)) && !opts.overwrite) slug = `${slug}-${String(pid).slice(-4).toLowerCase()}`;

  // Photos
  const imgDir = path.join(ROOT, 'public/images/products');
  fs.mkdirSync(imgDir, { recursive: true });
  const saved = [];
  if (!opts['no-images']) {
    for (const [i, url] of images(p).slice(0, config.maxImages).entries()) {
      const file = `${slug}-${i + 1}.jpg`;
      try {
        await saveImage(url, path.join(imgDir, file));
        saved.push({ src: `/images/products/${file}`, alt: `${title}, photo ${i + 1}` });
      } catch (e) {
        console.warn(`⚠ Could not download ${url}: ${e.message}`);
      }
    }
  }
  if (!saved.length) saved.push({ src: '/images/site/og-default.jpg', alt: title });

  const kids = category === 'Craft Kits (Kids)';
  const product = {
    title,
    summary: `${title}. Please rewrite this in your own words before publishing.`,
    description: stripHtml(p.description).slice(0, 1500) || 'Please add a description.',
    category,
    price: base.price,
    costPrice: base.cost,
    fulfilment: 'cj',
    supplier: {
      name: 'CJdropshipping',
      productId: p.pid,
      sku: p.productSku || base.sku,
      variantId: priced.length === 1 ? base.variantId : '',
      url: `https://cjdropshipping.com/product/-p-${p.pid}.html`,
      warehouse: ship?.from || config.fallbackWarehouse,
    },
    variants: priced.length > 1 ? priced.map(({ name, sku, variantId, price }) => ({ name, sku, variantId, price })) : [],
    deliveryEstimate,
    images: saved,
    childrensItem: kids,
    ageSuitability: kids ? 'Ages 3+ with adult supervision (check with supplier)' : '',
    safetyNote: kids ? 'CHECK BEFORE PUBLISHING: confirm UKCA/CE marking and age warnings with the supplier.' : '',
    featured: false,
    boughtTogether: [],
    draft: true,
  };
  const file = path.join(outDir, `${slug}.json`);
  fs.writeFileSync(file, `${JSON.stringify(product, null, 2)}\n`);

  console.log(`\n✔ Saved as a draft: src/content/products/${slug}.json`);
  console.log(`  Ships from ${ship?.from || '?'} via ${ship?.name || '?'} · ${deliveryEstimate}`);
  console.log(`  £1 = $${(1 / rate).toFixed(3)} · markup ×${markup}`);
  for (const v of priced) console.log(`  ${v.name.padEnd(30).slice(0, 30)} cost £${v.cost.toFixed(2)} → sell £${v.price.toFixed(2)}`);
  console.log('\nNext: check the words and photos (in Pages CMS or the file), untick "Draft", and publish.\n');
}

// ---- main ---------------------------------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  loadEnv();
  const opts = args();
  try {
    if (opts.search) await search(String(opts.search));
    else if (opts.id) await importProduct(String(opts.id), opts);
    else console.log('Usage:\n  npm run import:cj -- --search "paper quilling"\n  npm run import:cj -- --id <CJ product ID> [--category "Craft Kits (Kids)"] [--markup 2.5] [--no-images] [--overwrite]');
  } catch (e) {
    fail(e.message);
  }
}
