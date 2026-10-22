// Builds the printable packs as print-ready PDFs (A4 and US Letter) plus a
// PNG of every page for checking and for shop pictures.
//
//   node scripts/printables/build.mjs [outDir] [--only=colouring] [--no-pdf]
//
// Needs Playwright with Chromium (npm i -D playwright, then npx playwright install chromium).

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import colouring from './colouring.mjs';
import activity from './activity.mjs';
import { previews } from './previews.mjs';

const args = process.argv.slice(2);
const outDir = resolve(args.find((a) => !a.startsWith('--')) || 'printables-out');
const only = args.find((a) => a.startsWith('--only='))?.slice(7);
const pdf = !args.includes('--no-pdf');

const SIZES = {
  A4: { w: 210, h: 297 },
  Letter: { w: 215.9, h: 279.4 },
};

async function fontFace(family, file, weight) {
  const data = await readFile(resolve('node_modules/@fontsource', file));
  return `@font-face{font-family:'${family}';font-weight:${weight};src:url(data:font/woff2;base64,${data.toString('base64')}) format('woff2')}`;
}

const fonts = (
  await Promise.all([
    fontFace('Nunito', 'nunito/files/nunito-latin-400-normal.woff2', 400),
    fontFace('Nunito', 'nunito/files/nunito-latin-700-normal.woff2', 700),
    fontFace('Nunito', 'nunito/files/nunito-latin-800-normal.woff2', 800),
    fontFace('Nunito', 'nunito/files/nunito-latin-900-normal.woff2', 900),
    fontFace('Pacifico', 'pacifico/files/pacifico-latin-400-normal.woff2', 400),
  ])
).join('');

function html(pages, size) {
  const { w, h } = SIZES[size];
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fonts}
    @page{size:${w}mm ${h}mm;margin:0}
    html,body{margin:0;padding:0;background:#fff}
    .pg{width:${w}mm;height:${h}mm;page-break-after:always;break-after:page;overflow:hidden;position:relative}
    .pg:last-child{page-break-after:auto;break-after:auto}
    .pg>svg{width:100%;height:100%;display:block}
  </style></head><body>${pages.map((p) => `<div class="pg">${p}</div>`).join('')}</body></html>`;
}

const browser = await chromium.launch();
const context = await browser.newContext({ deviceScaleFactor: 2 });
const tab = await context.newPage();
const shots = {};

for (const pack of [colouring, activity]) {
  if (only && pack.id !== only) continue;
  const dir = join(outDir, pack.id);
  await mkdir(join(dir, 'pages'), { recursive: true });

  await tab.setContent(html(pack.pages, 'A4'), { waitUntil: 'load' });
  await tab.evaluate(() => document.fonts.ready);
  const els = await tab.$$('.pg');
  shots[pack.id] = [];
  for (let i = 0; i < els.length; i++) {
    const file = join(dir, 'pages', `${String(i + 1).padStart(2, '0')}.png`);
    await els[i].screenshot({ path: file });
    shots[pack.id].push(file);
  }

  if (pack.coloured) {
    await mkdir(join(dir, 'coloured'), { recursive: true });
    await tab.setContent(html(pack.coloured, 'A4'), { waitUntil: 'load' });
    await tab.evaluate(() => document.fonts.ready);
    const cels = await tab.$$('.pg');
    shots[pack.id + '-coloured'] = [];
    for (let i = 0; i < cels.length; i++) {
      const file = join(dir, 'coloured', `${String(i + 1).padStart(2, '0')}.png`);
      await cels[i].screenshot({ path: file });
      shots[pack.id + '-coloured'].push(file);
    }
  }

  if (pdf) {
    for (const size of Object.keys(SIZES)) {
      await tab.setContent(html(pack.pages, size), { waitUntil: 'load' });
      await tab.evaluate(() => document.fonts.ready);
      const file = join(dir, `${pack.file}-${size}.pdf`);
      await tab.pdf({ path: file, preferCSSPageSize: true, printBackground: true });
      console.log('wrote', file);
    }
  }
  if (pack.sample) {
    await tab.setContent(html([pack.pages[pack.sample]], 'A4'), { waitUntil: 'load' });
    await tab.evaluate(() => document.fonts.ready);
    const file = join(dir, `${pack.file}-free-sample-A4.pdf`);
    if (pdf) await tab.pdf({ path: file, preferCSSPageSize: true, printBackground: true });
  }
}

if (!only && pdf) await previews(tab, outDir, { colouring, activity, fonts, shots });
await browser.close();
await writeFile(join(outDir, 'README.txt'), 'Built by scripts/printables/build.mjs\n');
