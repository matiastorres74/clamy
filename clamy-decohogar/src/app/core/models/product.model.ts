// Categories live in the database and the admin edits them; see
// CategoryService. The id is a slug fixed at creation, the label can change.
export interface Category {
  id: string;
  label: string;
  position: number;
}

export type CategoryId = string;

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
