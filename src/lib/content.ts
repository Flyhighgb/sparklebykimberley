import { getCollection, type CollectionEntry } from 'astro:content';
import settings from '../data/settings.json';
import { CATEGORIES } from '../content.config';

export type Tutorial = CollectionEntry<'tutorials'>;
export type Product = CollectionEntry<'products'>;

export { settings };

/** When an Etsy shop is set, products are bought on Etsy and the basket and checkout are hidden. */
export const etsyShopUrl = settings.etsyShop ? `https://www.etsy.com/uk/shop/${settings.etsyShop}` : '';
export const sellsOnEtsy = Boolean(etsyShopUrl);

export const API_URL = (import.meta.env.PUBLIC_API_URL || 'https://api.sparklebykimberley.co.uk').replace(/\/$/, '');

export async function getTutorials(): Promise<Tutorial[]> {
  const all = await getCollection('tutorials', ({ data }) => !data.draft);
  return all.sort((a, b) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf());
}

export async function getProducts(): Promise<Product[]> {
  const all = await getCollection('products', ({ data }) => !data.draft);
  return all.sort((a, b) => Number(b.data.featured) - Number(a.data.featured) || a.data.title.localeCompare(b.data.title));
}

/** Category names in shop order: the standard ones first, then any others (such as Etsy sections). */
export function shopCategories(products: Product[]): string[] {
  const used = new Set(products.map((p) => p.data.category));
  return [...CATEGORIES.filter((c) => used.has(c)), ...[...used].filter((c) => !(CATEGORIES as readonly string[]).includes(c)).sort()];
}

export function gbp(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const audienceLabel: Record<string, string> = {
  adults: 'Grown-ups',
  kids: 'Little hands',
  family: 'Family',
};

export function timeLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} mins`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hr ${m} mins` : `${h} hr${h > 1 ? 's' : ''}`;
}

export function timeBucket(minutes: number): string {
  if (minutes <= 30) return 'under-30';
  if (minutes <= 60) return '30-60';
  return 'over-60';
}

export function isoDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}`;
}

export function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function lowestPrice(p: Product): number {
  const prices = [p.data.price, ...p.data.variants.map((v) => v.price ?? p.data.price)];
  return Math.min(...prices);
}
