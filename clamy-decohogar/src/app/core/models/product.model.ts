export interface Category {
  id: CategoryId;
  label: string;
}

export type CategoryId = 'furniture' | 'lighting' | 'decoration' | 'kitchen' | 'everyday-use';

export const CATEGORIES: Category[] = [
  { id: 'furniture', label: 'Muebles' },
  { id: 'lighting', label: 'Iluminación' },
  { id: 'decoration', label: 'Decoración' },
  { id: 'kitchen', label: 'Cocina' },
  { id: 'everyday-use', label: 'Varios' },
];

export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  /** Only present when the request carried an admin token; the public API strips it. */
  price?: number;
  /** Public photo URLs in display order; the first one is the cover. */
  images: string[];
  category: CategoryId;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

// Writes still require a price: it stays mandatory for internal admin use
// even though the showroom never shows it.
export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'price'> & {
  price: number;
};
