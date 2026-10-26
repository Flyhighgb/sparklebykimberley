import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

export const AUDIENCES = ['adults', 'kids', 'family'] as const;
export const DIFFICULTIES = ['Easy', 'Medium', 'Tricky'] as const;
export const TECHNIQUES = [
  'origami',
  'quilling',
  'card making',
  'paper flowers',
  'pop-up cards',
  'collage',
  'scrapbooking',
  'paper cutting',
  'garlands',
] as const;
export const OCCASIONS = [
  'any time',
  'birthdays',
  'spring',
  'summer',
  'autumn',
  'winter',
  'christmas',
  'easter',
  'valentines',
  'mothers day',
  'fathers day',
  'halloween',
  'weddings',
  'rainy day',
  'back to school',
] as const;
export const CATEGORIES = [
  'Card & Paper',
  'Craft Kits (Adults)',
  'Craft Kits (Kids)',
  'Tools & Adhesives',
  'Embellishments',
  'Printable Downloads',
  'Sparkle Merch',
  'Gift Sets',
] as const;
export const FULFILMENT = ['etsy', 'cj', 'prodigi', 'digital', 'manual'] as const;

// The CMS can save empty optional fields as null or "", so be forgiving with those.
const optStr = z.string().nullish().transform((v) => v || '');
const optList = <T extends z.ZodType>(item: T) => z.array(item).nullish().transform((v) => v ?? []);

const tutorials = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tutorials' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(170),
    audience: z.enum(AUDIENCES),
    difficulty: z.enum(DIFFICULTIES),
    timeMinutes: z.number().int().positive(),
    ageRange: z.string(),
    cost: z.string(),
    occasions: z.array(z.enum(OCCASIONS)).nullish().transform((v) => (v?.length ? v : ['any time' as const])),
    techniques: z.array(z.enum(TECHNIQUES)).min(1),
    heroImage: z.string(),
    heroAlt: z.string(),
    publishDate: z.coerce.date(),
    materials: optList(z.object({ item: z.string(), product: optStr, link: optStr })),
    steps: z
      .array(
        z.object({
          title: z.string(),
          text: z.string(),
          image: optStr,
          alt: optStr,
        }),
      )
      .min(1),
    video: optStr,
    printable: z.object({ file: optStr, label: optStr }).nullish(),
    tips: optList(z.string()),
    safety: optList(z.string()),
    shopProducts: optList(z.string()),
    seasonal: z.boolean().nullish().transform(Boolean),
    draft: z.boolean().nullish().transform(Boolean),
  }),
});

const products = defineCollection({
  // Etsy listings live in an etsy/ subfolder; use just the file name so their pages are /shop/<name>.
  loader: glob({
    pattern: '**/*.json',
    base: './src/content/products',
    generateId: ({ entry }) => entry.replace(/\.json$/, '').split('/').pop()!,
  }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    description: z.string(),
    // Etsy listings use the shop's own section names, so any category is allowed.
    category: z.string(),
    price: z.number().positive(),
    costPrice: z.number().nonnegative().nullish().transform((v) => v ?? 0),
    fulfilment: z.enum(FULFILMENT).nullish().transform((v) => v ?? 'manual'),
    etsyUrl: optStr,
    supplier: z
      .object({
        name: optStr,
        productId: optStr,
        sku: optStr,
        variantId: optStr,
        url: optStr,
        warehouse: optStr,
        assetUrl: optStr,
        attributes: z.record(z.string(), z.string()).nullish().transform((v) => v ?? {}),
        downloadKey: optStr,
      })
      .nullish()
      .transform((v) => v ?? { name: '', productId: '', sku: '', variantId: '', url: '', warehouse: '', assetUrl: '', attributes: {}, downloadKey: '' }),
    variants: optList(
      z.object({
        name: z.string(),
        sku: optStr,
        variantId: optStr,
        price: z.number().positive().nullish().transform((v) => v ?? undefined),
      }),
    ),
    deliveryEstimate: optStr,
    images: z.array(z.object({ src: z.string(), alt: z.string() })).min(1),
    childrensItem: z.boolean().nullish().transform(Boolean),
    ageSuitability: optStr,
    safetyNote: optStr,
    featured: z.boolean().nullish().transform(Boolean),
    boughtTogether: optList(z.string()),
    // Filled in from Etsy by the import, for the product's search listing details.
    digital: z.boolean().nullish().transform(Boolean),
    returns: z.object({ accepted: z.boolean(), days: z.number().nullish() }).nullish(),
    draft: z.boolean().nullish().transform(Boolean),
  }),
});

export const collections = { tutorials, products };
