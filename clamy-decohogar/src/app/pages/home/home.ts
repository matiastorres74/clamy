import { Component, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../core/services/product';
import { ProductCard } from '../../shared/product-card/product-card';
import { CATEGORIES, Product } from '../../core/models/product.model';

const SLIDE_INTERVAL_MS = 6000;

@Component({
  selector: 'app-home',
  imports: [RouterLink, ProductCard],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private slideTimer?: ReturnType<typeof setInterval>;

  protected categories = CATEGORIES;
  protected featured = signal<Product[]>([]);
  protected loading = signal(true);

  protected heroSlides = ['assets/hero-1.jpg', 'assets/hero-2.jpg'];
  protected activeSlide = signal(0);

  ngOnInit(): void {
    this.productService.getAll().subscribe({
      next: (products) => {
        const featured = products.filter((p) => p.featured);
        this.featured.set((featured.length > 0 ? featured : products).slice(0, 4));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    if (this.isBrowser && this.heroSlides.length > 1) {
      this.slideTimer = setInterval(() => {
        this.activeSlide.update((i) => (i + 1) % this.heroSlides.length);
      }, SLIDE_INTERVAL_MS);
    }
  }

  ngOnDestroy(): void {
    if (this.slideTimer) {
      clearInterval(this.slideTimer);
    }
  }

  selectSlide(index: number): void {
    this.activeSlide.set(index);
  }
}
