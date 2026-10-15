import type { Env } from '../env';
import { sendEmail, layout, button } from '../email';
import { hmacHex, esc } from '../util';
import type { SupplierAdapter } from './types';

/** Build a signed, time-limited link to a file in the R2 downloads bucket. */
export async function signedDownloadUrl(env: Env, key: string, orderId: string): Promise<string> {
  const days = Number(env.DOWNLOAD_LINK_DAYS || '7');
  const expires = Math.floor(Date.now() / 1000) + days * 86400;
  const sig = await hmacHex(env.DOWNLOAD_SIGNING_SECRET, `${key}|${orderId}|${expires}`);
  const q = new URLSearchParams({ k: key, o: orderId, e: String(expires), s: sig });
  return `${env.API_URL}/api/download?${q}`;
}

export const digital: SupplierAdapter = {
  id: 'digital',
  label: 'Digital download',

  async submit({ env, order, lines, products }) {
    if (!env.DOWNLOAD_SIGNING_SECRET) throw new Error('DOWNLOAD_SIGNING_SECRET secret is not set');
    const bucket = env.DOWNLOADS;
    if (!bucket) throw new Error('R2 storage is not switched on in Cloudflare yet, so downloads cannot be sent');
    const links: { title: string; url: string }[] = [];
    for (const l of lines) {
      const key = products.get(l.product_id)?.supplier.downloadKey;
      if (!key) throw new Error(`No download file set for "${l.title}"`);
      const exists = await bucket.head(key);
      if (!exists) throw new Error(`Download file "${key}" is missing from the R2 bucket`);
      links.push({ title: l.title, url: await signedDownloadUrl(env, key, order.id) });
    }
    const days = env.DOWNLOAD_LINK_DAYS || '7';
    await sendEmail(env, {
      to: order.email,
      subject: `Your Sparkle printables are ready! (${order.id})`,
      replyTo: env.OWNER_EMAIL,
      html: layout(
        env,
        'Your downloads are ready!',
        `<p>Hello${order.name ? ` ${esc(order.name.split(' ')[0])}` : ''}! Thank you so much for your order. Here are your printables:</p>
        ${links.map((d) => `<p style="margin:0 0 4px"><strong>${esc(d.title)}</strong></p>${button(d.url, 'Download now')}`).join('')}
        <p>These links work for ${esc(days)} days, so do save the files somewhere safe. Print on A4 paper or card for best results.</p>
        <p>Have fun, and don't worry if it's not perfect, that's half the fun!</p>`,
      ),
    });
    return [{ status: 'fulfilled', note: `Download links emailed to customer (valid ${days} days)` }];
  },
};
