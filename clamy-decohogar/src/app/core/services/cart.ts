import { Service, inject, signal, computed, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Product } from '../models/product.model';

export interface CartItem {
  product: Product;
  qty: number;
}

const CART_KEY = 'clamy_cart';

@Service()
export class CartService {
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly items = signal<CartItem[]>(this.loadCart());

  readonly cartItems = this.items.asReadonly();
  readonly count = computed(() => this.items().reduce((sum, i) => sum + i.qty, 0));
  readonly subtotal = computed(() =>
    this.items().reduce((sum, i) => sum + i.qty * i.product.price, 0),
  );

  constructor() {
    effect(() => {
      const items = this.items();
      if (this.isBrowser) {
        localStorage.setItem(CART_KEY, JSON.stringify(items));
      }
    });
  }

  private loadCart(): CartItem[] {
    if (!this.isBrowser) return [];
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  add(product: Product, qty = 1): void {
    this.items.update((items) => {
      const existing = items.find((i) => i.product.id === product.id);
      if (existing) {
        return items.map((i) =>
          i.product.id === product.id ? { ...i, qty: i.qty + qty } : i,
        );
      }
      return [...items, { product, qty }];
    });
  }

  updateQty(productId: number, qty: number): void {
    if (qty <= 0) {
      this.remove(productId);
      return;
    }
    this.items.update((items) =>
      items.map((i) => (i.product.id === productId ? { ...i, qty } : i)),
    );
  }

  remove(productId: number): void {
    this.items.update((items) => items.filter((i) => i.product.id !== productId));
  }

  clear(): void {
    this.items.set([]);
  }
}
