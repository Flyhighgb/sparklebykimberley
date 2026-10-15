/** Shopping basket kept in the browser (localStorage). Prices are always re-checked by the Worker. */
export interface CartLine {
  id: string; // product slug
  variant?: string; // variant name, if the product has variants
  qty: number;
}
const KEY = 'sparkle-cart';
const MAX_QTY = 20;

export function getCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((l) => l && typeof l.id === 'string' && l.qty > 0) : [];
  } catch {
    return [];
  }
}

function save(lines: CartLine[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new CustomEvent('cart:change'));
}

const same = (a: CartLine, id: string, variant?: string) => a.id === id && (a.variant || '') === (variant || '');

export function addToCart(id: string, qty = 1, variant?: string): void {
  const lines = getCart();
  const existing = lines.find((l) => same(l, id, variant));
  if (existing) existing.qty = Math.min(MAX_QTY, existing.qty + qty);
  else lines.push({ id, variant: variant || undefined, qty: Math.min(MAX_QTY, qty) });
  save(lines);
}

export function setQty(id: string, variant: string | undefined, qty: number): void {
  let lines = getCart();
  if (qty <= 0) lines = lines.filter((l) => !same(l, id, variant));
  else lines.forEach((l) => same(l, id, variant) && (l.qty = Math.min(MAX_QTY, qty)));
  save(lines);
}

export function clearCart(): void {
  save([]);
}

export function cartCount(): number {
  return getCart().reduce((n, l) => n + l.qty, 0);
}

export async function startCheckout(apiUrl: string): Promise<void> {
  const res = await fetch(`${apiUrl}/api/checkout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items: getCart() }),
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error || 'Sorry, checkout is not available right now.');
  window.location.href = data.url;
}
