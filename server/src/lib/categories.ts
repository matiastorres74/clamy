export const CATEGORIES = [
  { id: 'furniture', label: 'Muebles' },
  { id: 'lighting', label: 'Iluminación' },
  { id: 'decoration', label: 'Decoración' },
  { id: 'kitchen', label: 'Cocina' },
  { id: 'everyday-use', label: 'Varios' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

export const CATEGORY_IDS: CategoryId[] = CATEGORIES.map((c) => c.id);

export function isValidCategory(value: unknown): value is CategoryId {
  return typeof value === 'string' && (CATEGORY_IDS as string[]).includes(value);
}
