import { sendEmail, layout } from '../email';
import { esc, gbp } from '../util';
import type { SupplierAdapter } from './types';

/**
 * For suppliers without an API (e.g. Pound Wholesale): email the owner everything
 * they need to place the order by hand. They then add tracking on the admin page.
 */
export const manual: SupplierAdapter = {
  id: 'manual',
  label: 'Manual (owner places order)',

  async submit({ env, order, address, lines, products }) {
    const rows = lines
      .map((l) => {
        const p = products.get(l.product_id);
        const link = p?.supplier.url ? `<a href="${esc(p.supplier.url)}">${esc(p.supplier.name || 'Supplier link')}</a>` : esc(p?.supplier.name || 'Unknown supplier');
        return `<tr><td style="padding:6px;border:1px solid #ddd">${l.quantity} × ${esc(l.title)}${l.variant ? ` (${esc(l.variant)})` : ''}</td>
          <td style="padding:6px;border:1px solid #ddd">${esc(l.supplier_sku || p?.supplier.sku || '-')}</td>
          <td style="padding:6px;border:1px solid #ddd">${link}</td>
          <td style="padding:6px;border:1px solid #ddd">${gbp(l.unit_price_pence * l.quantity)}</td></tr>`;
      })
      .join('');
    const addr = address
      ? [order.name, address.line1, address.line2, address.city, address.county, address.postcode, 'United Kingdom'].filter(Boolean).map(esc).join('<br>')
      : 'No address';
    await sendEmail(env, {
      to: env.OWNER_EMAIL,
      subject: `📦 Order to place: ${order.id}`,
      html: layout(
        env,
        `Order to place by hand: ${order.id}`,
        `<p>Please order these items from the supplier and have them sent straight to the customer.</p>
        <table style="border-collapse:collapse;width:100%;font-size:14px"><tr><th align="left">Item</th><th align="left">Supplier SKU</th><th align="left">Supplier</th><th align="left">Sold for</th></tr>${rows}</table>
        <h2 style="font-size:18px">Deliver to</h2><p>${addr}<br>Phone: ${esc(order.phone || '-')}<br>Email: ${esc(order.email)}</p>
        <p>When it ships, add the tracking number on the <a href="${env.API_URL}/admin">orders admin page</a> and the customer will be emailed automatically.</p>`,
      ),
    });
    return [{ status: 'awaiting_owner', note: 'Order-to-place email sent to owner' }];
  },
};
