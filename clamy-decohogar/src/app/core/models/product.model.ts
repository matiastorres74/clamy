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
  price: number;
  imageUrl: string | null;
  category: CategoryId;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
