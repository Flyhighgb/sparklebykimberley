// Runs automatically before every build (npm run build).
// Shrinks any photo in public/images that is wider than 1600px or heavier than 350 KB,
// so photos uploaded straight from a phone don't slow the site down.
// Print artwork in public/images/merch is left untouched (Prodigi needs full resolution).
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve('public/images');
const SKIP = [path.join(ROOT, 'merch')];
const MAX_WIDTH = 1600;
const MAX_BYTES = 350 * 1024;

async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (SKIP.some((s) => full.startsWith(s))) continue;
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(jpe?g|png|webp)$/i.test(entry.name)) yield full;
  }
}

let changed = 0;
for await (const file of walk(ROOT)) {
  const stat = await fs.stat(file);
  const meta = await sharp(file).metadata();
  if ((meta.width ?? 0) <= MAX_WIDTH && stat.size <= MAX_BYTES) continue;
  const ext = path.extname(file).toLowerCase();
  let img = sharp(file).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true });
  img = ext === '.png' ? img.png({ compressionLevel: 9, palette: true }) : ext === '.webp' ? img.webp({ quality: 80 }) : img.jpeg({ quality: 80, mozjpeg: true });
  const buf = await img.toBuffer();
  if (buf.length < stat.size) {
    await fs.writeFile(file, buf);
    changed++;
    console.log(`optimised ${path.relative(ROOT, file)}: ${Math.round(stat.size / 1024)} KB -> ${Math.round(buf.length / 1024)} KB`);
  }
}
console.log(changed ? `Optimised ${changed} image(s).` : 'Images already optimised.');
