import type { SupplierAdapter } from './types';
import { cj } from './cj';
import { prodigi } from './prodigi';
import { digital } from './digital';
import { manual } from './manual';

/**
 * Every supplier the shop can route orders to. To add a new one:
 *   1. Copy manual.ts (or cj.ts) to a new file, e.g. mysupplier.ts, and fill in submit/checkStatus.
 *   2. Import it here and add it to this list.
 *   3. Add its id to FULFILMENT in src/content.config.ts and the CMS options in .pages.yml.
 */
export const adapters: Record<string, SupplierAdapter> = Object.fromEntries(
  [cj, prodigi, digital, manual].map((a) => [a.id, a]),
);

export type { SupplierAdapter } from './types';
