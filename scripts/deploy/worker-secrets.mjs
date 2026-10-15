// Copies the keys from GitHub secrets into the Worker's encrypted secrets (they never touch the code).
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { wrangler } from './lib.mjs';

const stripeIds = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const existing = new Set(JSON.parse(wrangler(['secret', 'list', '--format', 'json'], { quiet: true })).map((s) => s.name));

const secrets = { ...stripeIds };
for (const name of ['STRIPE_SECRET_KEY', 'CJ_API_KEY', 'PRODIGI_API_KEY', 'RESEND_API_KEY', 'RESEND_AUDIENCE_ID', 'ADMIN_PASSWORD']) {
  if (process.env[name]) secrets[name] = process.env[name];
}
if (!existing.has('DOWNLOAD_SIGNING_SECRET')) secrets.DOWNLOAD_SIGNING_SECRET = crypto.randomBytes(32).toString('hex');

const file = path.join(os.tmpdir(), `secrets-${process.pid}.json`);
fs.writeFileSync(file, JSON.stringify(secrets), { mode: 0o600 });
try {
  wrangler(['secret', 'bulk', file]);
} finally {
  fs.rmSync(file, { force: true });
}
console.log(`✔ Worker secrets updated: ${Object.keys(secrets).join(', ')}`);
for (const name of ['STRIPE_SECRET_KEY', 'ADMIN_PASSWORD', 'RESEND_API_KEY', 'CJ_API_KEY', 'PRODIGI_API_KEY'])
  if (!secrets[name] && !existing.has(name)) console.log(`::warning::${name} isn't set yet, so that part of the shop won't work until you add it as a GitHub secret.`);
