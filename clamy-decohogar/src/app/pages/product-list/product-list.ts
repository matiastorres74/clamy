import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../core/services/product';
import { ProductCard } from '../../shared/product-card/product-card';
import { CATEGORIES, Product } from '../../core/models/product.model';

@Component({
  selector: 'app-product-list',
  imports: [FormsModule, ProductCard],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList implements OnInit {
  private productService = inject(ProductService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  protected categories = CATEGORIES;
  protected products = signal<Product[]>([]);
  protected loading = signal(true);
  protected activeCategory = signal<string | null>(null);
  protected searchTerm = signal('');

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.activeCategory.set(params.get('category'));
      this.searchTerm.set(params.get('search') ?? '');
      this.fetch();
    });
  }

  selectCategory(categoryId: string | null): void {
    this.router.navigate(['/productos'], {
      queryParams: { category: categoryId, search: this.searchTerm() || null },
    });
  }

  onSearchSubmit(): void {
    this.router.navigate(['/productos'], {
      queryParams: { category: this.activeCategory(), search: this.searchTerm() || null },
    });
  }

  private fetch(): void {
    this.loading.set(true);
    this.productService
      .getAll({
        category: this.activeCategory() ?? undefined,
        search: this.searchTerm() || undefined,
      })
      .subscribe({
        next: (products) => {
          this.products.set(products);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
