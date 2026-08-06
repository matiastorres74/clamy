import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CartService } from './cart';
import { Product } from '../models/product.model';

const CART_KEY = 'clamy_cart';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: 'Lámpara de pie',
    description: 'Una lámpara de pie de madera',
    price: 1000,
    imageUrl: null,
    category: 'lighting',
    featured: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('CartService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('starts empty when there is nothing in localStorage', () => {
    const cart = TestBed.inject(CartService);

    expect(cart.cartItems()).toEqual([]);
    expect(cart.count()).toBe(0);
    expect(cart.subtotal()).toBe(0);
  });

  it('adds a new product with quantity 1 by default', () => {
    const cart = TestBed.inject(CartService);
    const product = makeProduct();

    cart.add(product);

    expect(cart.cartItems()).toEqual([{ product, qty: 1 }]);
  });

  it('increments the quantity when the same product is added again', () => {
    const cart = TestBed.inject(CartService);
    const product = makeProduct();

    cart.add(product);
    cart.add(product, 2);

    expect(cart.cartItems()).toEqual([{ product, qty: 3 }]);
  });

  it('keeps separate entries for different products', () => {
    const cart = TestBed.inject(CartService);
    const a = makeProduct({ id: 1 });
    const b = makeProduct({ id: 2, name: 'Silla' });

    cart.add(a);
    cart.add(b);

    expect(cart.cartItems().map((i) => i.product.id)).toEqual([1, 2]);
  });

  it('updateQty changes the quantity of an existing item', () => {
    const cart = TestBed.inject(CartService);
    const product = makeProduct();
    cart.add(product);

    cart.updateQty(product.id, 5);

    expect(cart.cartItems()).toEqual([{ product, qty: 5 }]);
  });

  it('updateQty removes the item once qty drops to 0 or below', () => {
    const cart = TestBed.inject(CartService);
    const product = makeProduct();
    cart.add(product);

    cart.updateQty(product.id, 0);

    expect(cart.cartItems()).toEqual([]);
  });

  it('remove deletes only the targeted product', () => {
    const cart = TestBed.inject(CartService);
    const a = makeProduct({ id: 1 });
    const b = makeProduct({ id: 2 });
    cart.add(a);
    cart.add(b);

    cart.remove(1);

    expect(cart.cartItems()).toEqual([{ product: b, qty: 1 }]);
  });

  it('clear empties the cart', () => {
    const cart = TestBed.inject(CartService);
    cart.add(makeProduct());

    cart.clear();

    expect(cart.cartItems()).toEqual([]);
  });

  it('count sums quantities across all items', () => {
    const cart = TestBed.inject(CartService);
    cart.add(makeProduct({ id: 1 }), 2);
    cart.add(makeProduct({ id: 2 }), 3);

    expect(cart.count()).toBe(5);
  });

  it('subtotal sums price * qty across all items', () => {
    const cart = TestBed.inject(CartService);
    cart.add(makeProduct({ id: 1, price: 100 }), 2);
    cart.add(makeProduct({ id: 2, price: 50 }), 3);

    expect(cart.subtotal()).toBe(350);
  });

  it('persists cart changes to localStorage', () => {
    const cart = TestBed.inject(CartService);
    const product = makeProduct();

    cart.add(product);
    TestBed.inject(ApplicationRef).tick();

    const stored = JSON.parse(localStorage.getItem(CART_KEY) ?? '[]');
    expect(stored).toEqual([{ product, qty: 1 }]);
  });

  it('loads existing cart items from localStorage on creation', () => {
    const product = makeProduct();
    localStorage.setItem(CART_KEY, JSON.stringify([{ product, qty: 4 }]));

    const cart = TestBed.inject(CartService);

    expect(cart.cartItems()).toEqual([{ product, qty: 4 }]);
  });

  it('falls back to an empty cart when localStorage has invalid JSON', () => {
    localStorage.setItem(CART_KEY, 'not-json');

    const cart = TestBed.inject(CartService);

    expect(cart.cartItems()).toEqual([]);
  });
});
