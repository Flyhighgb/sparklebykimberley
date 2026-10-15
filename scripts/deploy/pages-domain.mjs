// Points sparklebykimberley.co.uk and www at the Cloudflare Pages site (safe to run every time).
import { cf, need, PAGES_PROJECT, ZONE } from './lib.mjs';

const account = need('CLOUDFLARE_ACCOUNT_ID');
const target = `${PAGES_PROJECT}.pages.dev`;
const { result: zones } = await cf(`/zones?name=${ZONE}&account.id=${account}`);
const zoneId = zones[0].id;

for (const host of [ZONE, `www.${ZONE}`]) {
  try {
    await cf(`/accounts/${account}/pages/projects/${PAGES_PROJECT}/domains`, { method: 'POST', body: JSON.stringify({ name: host }) });
    console.log(`✔ Added ${host} to the Pages project`);
  } catch (e) {
    if (!/already|exists|8000018/i.test(e.message)) throw e;
  }
  const { result: records } = await cf(`/zones/${zoneId}/dns_records?name=${host}`);
  if (!records.some((r) => ['CNAME', 'A', 'AAAA'].includes(r.type))) {
    await cf(`/zones/${zoneId}/dns_records`, { method: 'POST', body: JSON.stringify({ type: 'CNAME', name: host, content: target, proxied: true }) });
    console.log(`✔ Created DNS record ${host} → ${target}`);
  } else if (!records.some((r) => r.content === target)) {
    console.log(`::warning::${host} already has a DNS record pointing somewhere else. Change it to a CNAME for ${target} in Cloudflare DNS if the site doesn't appear.`);
  }
}
console.log(`✔ https://${ZONE} is pointed at the site`);
