import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { ProductService } from '../../core/services/product';
import { ProductCard } from '../../shared/product-card/product-card';
import { CATEGORIES, Product } from '../../core/models/product.model';

const SLIDE_INTERVAL_MS = 6000;

interface HeroSlide {
  type: 'image' | 'video';
  src: string;
}

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

  @ViewChild('heroVideo') private heroVideoRef?: ElementRef<HTMLVideoElement>;

  protected categories = CATEGORIES;
  protected featured = signal<Product[]>([]);
  protected loading = signal(true);

  protected heroSlides: HeroSlide[] = [
    { type: 'image', src: 'assets/hero-3.jpg' },
    { type: 'video', src: 'assets/hero-4.mp4' },
  ];
  protected activeSlide = signal(0);

  constructor() {
    effect(() => {
      // Read the signal unconditionally first so this effect keeps a
      // dependency on it even on early runs where the video isn't
      // rendered yet — otherwise it never re-runs when the slide changes.
      const activeSlide = this.activeSlide();
      const video = this.heroVideoRef?.nativeElement;
      if (!video) return;

      const videoSlideIndex = this.heroSlides.findIndex((s) => s.type === 'video');
      if (activeSlide === videoSlideIndex) {
        video.currentTime = 0;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }

  ngOnInit(): void {
    // Ask the API for just the four cards this page renders. Fetching the whole
    // catalogue and filtering here meant the entire product list was serialised
    // into the SSR transfer-state blob — at 1000 products that was ~300kB of
    // HTML to show four items. The unfiltered follow-up only runs in the case
    // the previous code also covered: nothing is flagged as featured yet.
    this.productService
      .getAll({ featured: true, limit: 4 })
      .pipe(
        switchMap((featured) =>
          featured.length > 0 ? of(featured) : this.productService.getAll({ limit: 4 }),
        ),
      )
      .subscribe({
        next: (products) => {
          // The API already applies the limit; slicing again keeps this page
          // correct if it ships ahead of an API that doesn't honour it yet,
          // since the two projects deploy independently.
          this.featured.set(products.slice(0, 4));
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });

    const prefersReducedMotion =
      this.isBrowser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (this.isBrowser && !prefersReducedMotion && this.heroSlides.length > 1) {
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
