// Small helpers shared by the deploy scripts (run by GitHub Actions, see .github/workflows/deploy.yml).
import { execFileSync } from 'node:child_process';

export const ZONE = 'sparklebykimberley.co.uk';
export const PAGES_PROJECT = 'sparkle-by-kimberley';
export const API_URL = `https://api.${ZONE}`;

export function need(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`::error::Missing GitHub secret ${name}. Add it under Settings > Secrets and variables > Actions.`);
    process.exit(1);
  }
  return v;
}

/** Call the Cloudflare API. Returns the parsed body; throws with Cloudflare's message on failure. */
export async function cf(path, init = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: { authorization: `Bearer ${need('CLOUDFLARE_API_TOKEN')}`, 'content-type': 'application/json', ...(init.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    const msg = (body.errors || []).map((e) => `${e.code}: ${e.message}`).join('; ') || res.status;
    const err = new Error(`Cloudflare ${init.method || 'GET'} ${path} failed: ${msg}`);
    err.body = body;
    throw err;
  }
  return body;
}

/** Run wrangler in the worker folder and return its output. */
export function wrangler(args, { cwd = 'worker', quiet = false } = {}) {
  return execFileSync('npx', ['wrangler', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', quiet ? 'pipe' : 'inherit'] });
}

/** Hide a value from the (public) Actions log. */
export function mask(v) {
  if (v) console.log(`::add-mask::${v}`);
}
