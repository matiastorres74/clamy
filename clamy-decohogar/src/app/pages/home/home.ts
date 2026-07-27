import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../core/services/product';
import { ProductCard } from '../../shared/product-card/product-card';
import { CATEGORIES, Product } from '../../core/models/product.model';

@Component({
  selector: 'app-home',
  imports: [RouterLink, ProductCard],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private productService = inject(ProductService);
  protected categories = CATEGORIES;
  protected featured = signal<Product[]>([]);
  protected loading = signal(true);

  ngOnInit(): void {
    this.productService.getAll().subscribe({
      next: (products) => {
        const featured = products.filter((p) => p.featured);
        this.featured.set((featured.length > 0 ? featured : products).slice(0, 4));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
