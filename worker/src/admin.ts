import type { Env } from './env';
import type { LineRow, OrderRow } from './suppliers/types';
import { dispatchOrder, markShipped, parseAddress } from './orders';
import { esc, gbp, safeEqual } from './util';

/** Simple password protection using the browser's built-in login box (HTTP Basic auth). */
export function checkAuth(req: Request, env: Env): Response | null {
  const unauthorised = new Response('Please log in', {
    status: 401,
    headers: { 'www-authenticate': 'Basic realm="Sparkle orders", charset="UTF-8"', 'cache-control': 'no-store' },
  });
  if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 10) return new Response('Set an ADMIN_PASSWORD secret of at least 10 characters first.', { status: 503 });
  const header = req.headers.get('authorization') || '';
  if (!header.startsWith('Basic ')) return unauthorised;
  let decoded = '';
  try {
    decoded = atob(header.slice(6));
  } catch {
    return unauthorised;
  }
  const password = decoded.slice(decoded.indexOf(':') + 1);
  return safeEqual(password, env.ADMIN_PASSWORD) ? null : unauthorised;
}

const STATUS_STYLE: Record<string, string> = {
  pending: '#fff3c4',
  submitted: '#dcebff',
  fulfilled: '#d5f5f1',
  awaiting_owner: '#ffe0b8',
  shipped: '#d5f5f1',
  delivered: '#c6f0c6',
  cancelled: '#eee',
  failed: '#ffd0d6',
};
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  submitted: 'With supplier',
  fulfilled: 'Done (download sent)',
  awaiting_owner: 'You need to order this',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  failed: 'FAILED',
};

export async function adminPage(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const filter = url.searchParams.get('status') || '';
  const q = (url.searchParams.get('q') || '').trim();
  const msg = url.searchParams.get('msg') || '';

  let sql = 'SELECT * FROM orders';
  const binds: string[] = [];
  const where: string[] = [];
  if (filter) {
    where.push('id IN (SELECT order_id FROM order_lines WHERE status = ?)');
    binds.push(filter);
  }
  if (q) {
    where.push('(id LIKE ? OR email LIKE ? OR name LIKE ?)');
    binds.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
  sql += ' ORDER BY created_at DESC LIMIT 100';
  const { results: orders } = await env.DB.prepare(sql).bind(...binds).all<OrderRow>();

  const ids = orders.map((o) => o.id);
  const lines: LineRow[] = ids.length
    ? (await env.DB.prepare(`SELECT * FROM order_lines WHERE order_id IN (${ids.map(() => '?').join(',')}) ORDER BY id`).bind(...ids).all<LineRow>()).results
    : [];
  const events = ids.length
    ? (
        await env.DB.prepare(`SELECT order_id, message, created_at FROM order_events WHERE order_id IN (${ids.map(() => '?').join(',')}) ORDER BY id DESC`)
          .bind(...ids)
          .all<{ order_id: string; message: string; created_at: string }>()
      ).results
    : [];
  const counts = (
    await env.DB.prepare('SELECT status, COUNT(*) AS n FROM order_lines GROUP BY status').all<{ status: string; n: number }>()
  ).results;
  const countOf = (s: string) => counts.find((c) => c.status === s)?.n || 0;

  const orderHtml = orders
    .map((o) => {
      const ls = lines.filter((l) => l.order_id === o.id);
      const ev = events.filter((e) => e.order_id === o.id);
      const addr = parseAddress(o);
      const failedGroups = [...new Set(ls.filter((l) => l.status === 'failed').map((l) => l.fulfilment))];
      return `<article class="order">
        <header><h2>${esc(o.id)}</h2><span>${esc(o.created_at)} UTC</span><strong>${gbp(o.total_pence)}</strong></header>
        <p class="who">${esc(o.name || '')} · <a href="mailto:${esc(o.email)}">${esc(o.email)}</a>${o.phone ? ` · ${esc(o.phone)}` : ''}<br>
        ${addr ? esc([addr.line1, addr.line2, addr.city, addr.county, addr.postcode].filter(Boolean).join(', ')) : 'Download-only order'}</p>
        <table><thead><tr><th>Item</th><th>Supplier</th><th>Status</th><th>Tracking / notes</th><th></th></tr></thead><tbody>
        ${ls
          .map(
            (l) => `<tr>
            <td>${l.quantity} × ${esc(l.title)}${l.variant ? ` <em>(${esc(l.variant)})</em>` : ''}<br><small>SKU ${esc(l.supplier_sku || '-')}${l.supplier_variant_id ? ` · VID ${esc(l.supplier_variant_id)}` : ''}</small></td>
            <td>${esc(l.fulfilment)}${l.supplier_order_id ? `<br><small>#${esc(l.supplier_order_id)}</small>` : ''}</td>
            <td><span class="status" style="background:${STATUS_STYLE[l.status] || '#eee'}">${esc(STATUS_LABEL[l.status] || l.status)}</span></td>
            <td>${l.tracking_number ? `${l.tracking_url ? `<a href="${esc(l.tracking_url)}" target="_blank" rel="noopener">${esc(l.tracking_number)}</a>` : esc(l.tracking_number)}${l.carrier ? ` (${esc(l.carrier)})` : ''}` : ''}${l.error ? `<div class="err">${esc(l.error)}</div>` : ''}</td>
            <td>${
              ['awaiting_owner', 'failed', 'submitted'].includes(l.status) && l.fulfilment !== 'digital'
                ? `<details><summary>Mark shipped</summary><form method="post" action="/admin/ship">
                    <input type="hidden" name="line" value="${l.id}">
                    <label>Tracking number <input name="tracking" required></label>
                    <label>Carrier <input name="carrier" placeholder="Royal Mail"></label>
                    <label>Tracking link <input name="url" type="url" placeholder="https://"></label>
                    <button>Save &amp; email customer</button></form></details>`
                : ''
            }</td></tr>`,
          )
          .join('')}
        </tbody></table>
        ${failedGroups
          .map(
            (f) => `<form method="post" action="/admin/retry" class="retry"><input type="hidden" name="order" value="${esc(o.id)}"><input type="hidden" name="fulfilment" value="${esc(f)}"><button>↻ Retry ${esc(f)} submission</button></form>`,
          )
          .join('')}
        <details class="log"><summary>History (${ev.length})</summary><ul>${ev.map((e) => `<li><small>${esc(e.created_at)}</small> ${esc(e.message)}</li>`).join('')}</ul></details>
      </article>`;
    })
    .join('');

  const tab = (s: string, label: string) => `<a href="/admin${s ? `?status=${s}` : ''}" class="${filter === s ? 'on' : ''}">${label}</a>`;
  const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Orders · Sparkle by Kimberley</title><style>
body{font-family:Nunito,system-ui,sans-serif;background:#FFF1EE;color:#2B2B2B;margin:0;font-size:16px}
.wrap{max-width:1100px;margin:0 auto;padding:16px}
h1{margin:.2em 0}h1 span{color:#B0245F}
nav{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}nav a{padding:8px 14px;border:2px solid #2B2B2B;border-radius:999px;background:#fff;color:#2B2B2B;text-decoration:none;font-weight:700}nav a.on{background:#FFD23F}
.order{background:#fff;border-radius:16px;padding:16px;margin:16px 0;box-shadow:0 4px 14px rgba(0,0,0,.07)}
.order header{display:flex;flex-wrap:wrap;gap:12px;align-items:baseline}.order h2{margin:0;font-size:1.2rem}.order header strong{margin-left:auto;font-size:1.2rem}
.who{color:#444}table{width:100%;border-collapse:collapse;font-size:15px}th,td{text-align:left;padding:8px;border-bottom:1px solid #eee;vertical-align:top}
.status{display:inline-block;padding:2px 10px;border-radius:999px;font-weight:800;font-size:14px;white-space:nowrap}
.err{color:#a3001b;font-size:14px;margin-top:4px}
button{background:#FFD23F;border:2px solid #2B2B2B;border-radius:999px;padding:8px 14px;font-weight:800;cursor:pointer;font:inherit;font-weight:800}
.retry{display:inline-block;margin:10px 8px 0 0}
details form{display:grid;gap:6px;margin-top:6px;min-width:220px}input{font:inherit;padding:6px;border:2px solid #ccc;border-radius:8px;width:100%;box-sizing:border-box}label{font-size:14px;font-weight:700}
.msg{background:#d5f5f1;border:2px solid #3EC1B4;padding:10px 14px;border-radius:12px;font-weight:700}
.search{display:flex;gap:8px;max-width:420px}.log ul{font-size:14px;color:#444}
@media(max-width:700px){table,thead,tbody,tr,td,th{display:block}thead{display:none}tr{border-bottom:2px dashed #eee;padding:6px 0}td{border:0;padding:4px 0}}
</style></head><body><div class="wrap">
<h1><span>Sparkle</span> orders</h1>
${msg ? `<p class="msg" role="status">${esc(msg)}</p>` : ''}
<nav>${tab('', 'All')}${tab('failed', `Failed (${countOf('failed')})`)}${tab('awaiting_owner', `To order by hand (${countOf('awaiting_owner')})`)}${tab('submitted', `With supplier (${countOf('submitted')})`)}${tab('shipped', 'Shipped')}</nav>
<form class="search" method="get"><input name="q" value="${esc(q)}" placeholder="Search order ref, name or email"><button>Search</button></form>
${orderHtml || '<p>No orders here yet.</p>'}
</div></body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-frame-options': 'DENY' } });
}

/** POST handlers for the admin page. Only accepted from the admin page itself. */
export async function adminAction(req: Request, env: Env, path: string): Promise<Response> {
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin) return new Response('Forbidden', { status: 403 });
  const form = await req.formData();
  let msg = '';
  if (path === '/admin/retry') {
    const order = String(form.get('order') || '');
    const fulfilment = String(form.get('fulfilment') || '');
    const { failed } = await dispatchOrder(env, order, fulfilment);
    msg = failed.length ? `Still failing: ${failed.join('; ')}` : `${order}: ${fulfilment} sent to supplier successfully.`;
  } else if (path === '/admin/ship') {
    const line = Number(form.get('line'));
    const url = String(form.get('url') || '');
    await markShipped(env, line, String(form.get('tracking') || '').trim(), String(form.get('carrier') || '').trim(), /^https:\/\//.test(url) ? url : '');
    msg = 'Saved, and the customer has been emailed their tracking details.';
  }
  return Response.redirect(`${new URL(req.url).origin}/admin?msg=${encodeURIComponent(msg)}`, 303);
}
