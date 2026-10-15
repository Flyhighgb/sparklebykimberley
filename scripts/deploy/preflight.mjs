// Checks the Cloudflare token works and the domain is active on Cloudflare before deploying anything.
import { cf, need, ZONE } from './lib.mjs';

need('CLOUDFLARE_API_TOKEN');
const account = need('CLOUDFLARE_ACCOUNT_ID');
try {
  await cf('/user/tokens/verify');
} catch (e) {
  console.error(`::error::The CLOUDFLARE_API_TOKEN secret doesn't work: ${e.message}`);
  process.exit(1);
}
const { result } = await cf(`/zones?name=${ZONE}&account.id=${account}`);
if (!result.length) {
  console.error(`::error::${ZONE} isn't in this Cloudflare account yet. Add it in Cloudflare (Add a domain, Free plan) and change the nameservers where you bought it. See README step 1a.`);
  process.exit(1);
}
if (result[0].status !== 'active') {
  console.error(`::error::${ZONE} is in Cloudflare but not active yet (status: ${result[0].status}). Check the nameservers at your domain registrar match the ones Cloudflare gave you, wait for the "active" email, then run this deploy again.`);
  process.exit(1);
}
console.log(`✔ Cloudflare token works and ${ZONE} is active.`);
