import { Component, DestroyRef, OnInit, RESPONSE_INIT, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, of, switchMap, tap } from 'rxjs';
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
  // Captured in the injection context so takeUntilDestroyed can be used from
  // ngOnInit, where the router observable below is subscribed.
  private destroyRef = inject(DestroyRef);
  private responseInit = inject(RESPONSE_INIT, { optional: true });

  protected categories = CATEGORIES;
  protected products = signal<Product[]>([]);
  protected loading = signal(true);
  protected activeCategory = signal<string | null>(null);
  protected searchTerm = signal('');
  protected failed = signal(false);

  ngOnInit(): void {
    // switchMap drops the previous request whenever the filters change.
    // Subscribing per change let them race: picking "Muebles" then "Cocina"
    // quickly could show the Muebles results under the Cocina chip if that
    // response happened to arrive last.
    this.route.queryParamMap
      .pipe(
        tap((params) => {
          this.activeCategory.set(params.get('category'));
          this.searchTerm.set(params.get('search') ?? '');
          this.loading.set(true);
          this.failed.set(false);
        }),
        switchMap(() =>
          this.productService
            .getAll({
              category: this.activeCategory() ?? undefined,
              search: this.searchTerm() || undefined,
            })
            // Caught per request so one failure doesn't end the outer stream
            // and leave every later filter change dead.
            .pipe(catchError(() => of(null))),
        ),
        // queryParamMap lives as long as the router, not the component, so
        // without this the subscription outlives every visit to the page.
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((products) => {
        // Without the failure branch the page showed "no results" when the
        // API was down, which is indistinguishable from an empty catalogue.
        if (products === null) {
          this.failed.set(true);
          // Server-side only (null in the browser): a 503 keeps the CDN from
          // caching this error page for every visitor.
          if (this.responseInit) this.responseInit.status = 503;
        } else {
          this.products.set(products);
        }
        this.loading.set(false);
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
}
