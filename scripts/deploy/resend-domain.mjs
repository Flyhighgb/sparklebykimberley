// Sets up sparklebykimberley.co.uk as an email sending domain in Resend and adds the
// DNS records Resend asks for to Cloudflare. Skipped if RESEND_API_KEY isn't set.
import { cf, need, ZONE } from './lib.mjs';

const key = process.env.RESEND_API_KEY;
if (!key) {
  console.log('Skipping email domain set-up (no RESEND_API_KEY secret yet).');
  process.exit(0);
}
async function resend(method, path, body) {
  const res = await fetch(`https://api.resend.com${path}`, {
    method,
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${method} ${path}: ${data.message || res.status}`);
  return data;
}

let domains;
try {
  domains = (await resend('GET', '/domains')).data || [];
} catch (e) {
  console.log(`::warning::Couldn't manage the Resend domain (${e.message}). Use a "Full access" Resend API key, or verify the domain by hand in Resend.`);
  process.exit(0);
}
let domain = domains.find((d) => d.name === ZONE);
if (!domain) domain = await resend('POST', '/domains', { name: ZONE, region: 'eu-west-1' });
const detail = await resend('GET', `/domains/${domain.id}`);
if (detail.status === 'verified') {
  console.log(`✔ ${ZONE} is verified for sending email`);
  process.exit(0);
}

const account = need('CLOUDFLARE_ACCOUNT_ID');
const { result: zones } = await cf(`/zones?name=${ZONE}&account.id=${account}`);
const zoneId = zones[0].id;
for (const r of detail.records || []) {
  const name = r.name === '@' || r.name === ZONE ? ZONE : `${r.name.replace(new RegExp(`\\.?${ZONE.replace(/\./g, '\\.')}$`), '')}.${ZONE}`;
  const { result: existing } = await cf(`/zones/${zoneId}/dns_records?type=${r.type}&name=${name}`);
  if (existing.some((x) => x.content.replace(/"/g, '') === r.value)) continue;
  await cf(`/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: JSON.stringify({ type: r.type, name, content: r.value, ttl: 1, proxied: false, ...(r.type === 'MX' ? { priority: Number(r.priority) || 10 } : {}) }),
  });
  console.log(`✔ Added ${r.type} record for ${name}`);
}
await resend('POST', `/domains/${domain.id}/verify`);
console.log('✔ Asked Resend to verify the domain (it usually takes a few minutes; the next deploy will confirm).');
