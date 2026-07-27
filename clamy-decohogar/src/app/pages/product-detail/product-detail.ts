import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductService } from '../../core/services/product';
import { CartService } from '../../core/services/cart';
import { categoryLabel, Product } from '../../core/models/product.model';
import { ArsCurrencyPipe } from '../../shared/pipes/ars-currency.pipe';

@Component({
  selector: 'app-product-detail',
  imports: [RouterLink, ArsCurrencyPipe],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  protected cart = inject(CartService);
  protected categoryLabel = categoryLabel;

  protected product = signal<Product | null>(null);
  protected loading = signal(true);
  protected notFound = signal(false);
  protected qty = signal(1);
  protected added = signal(false);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.productService.getById(id).subscribe({
      next: (product) => {
        this.product.set(product);
        this.loading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  incrementQty(): void {
    this.qty.update((q) => q + 1);
  }

  decrementQty(): void {
    this.qty.update((q) => Math.max(1, q - 1));
  }

  addToCart(): void {
    const product = this.product();
    if (!product) return;
    this.cart.add(product, this.qty());
    this.added.set(true);
    setTimeout(() => this.added.set(false), 2000);
  }
}
