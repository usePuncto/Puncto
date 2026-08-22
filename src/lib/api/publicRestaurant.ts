/**
 * Public projections for guest-facing restaurant APIs.
 * Never expose cost, inventory recipe links, or internal order linkage.
 */

const PUBLIC_PRODUCT_KEYS = [
  'businessId',
  'name',
  'description',
  'category',
  'price',
  'imageUrl',
  'allergens',
  'available',
  'variations',
  'preparationTime',
  'displayOrder',
] as const;

const PUBLIC_TABLE_KEYS = [
  'businessId',
  'number',
  'capacity',
  'location',
  'active',
] as const;

function pickDefined(
  source: Record<string, unknown>,
  keys: readonly string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out;
}

export function toPublicProduct(
  id: string,
  data: Record<string, unknown> | undefined
): Record<string, unknown> {
  return { id, ...pickDefined(data || {}, PUBLIC_PRODUCT_KEYS) };
}

export function toPublicTable(
  id: string,
  data: Record<string, unknown> | undefined
): Record<string, unknown> {
  return { id, ...pickDefined(data || {}, PUBLIC_TABLE_KEYS) };
}
