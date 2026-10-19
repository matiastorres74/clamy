import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { ProductService } from '../../core/services/product';
import { ProductCard } from '../../shared/product-card/product-card';
import { CATEGORIES, Product } from '../../core/models/product.model';
import { environment } from '../../../environments/environment';

// How many products the "Destacados" section shows; two rows of the
// three-column showroom grid.
const FEATURED_COUNT = 6;

const HERO_VIDEO_SRC = 'assets/hero-4.mp4';

// The hero used to be a two-slide carousel: this photo, then a 2.3MB video
// six seconds later. The photo is now the hero and the paint the page is
// judged on, and the video is an upgrade layered on top once the page has
// finished loading — so it never competes with the photo for bandwidth.
// Below this width (the same breakpoint where the hero grows to 88svh) a
// phone pays for the video on mobile data and barely sees it behind the
// overlay, so it keeps the still.
const HERO_VIDEO_MEDIA = '(min-width: 43.75em) and (prefers-reduced-motion: no-preference)';

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, ProductCard],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private productService = inject(ProductService);
  private destroyRef = inject(DestroyRef);

  private heroVideo = viewChild<ElementRef<HTMLVideoElement>>('heroVideo');

  protected categories = CATEGORIES;
  protected whatsappUrl = `https://wa.me/${environment.whatsappNumber}`;
  protected featured = signal<Product[]>([]);
  protected loading = signal(true);
  protected failed = signal(false);

  // Null on the server and until the page has loaded, so the SSR markup holds
  // no <video> and the browser never starts fetching it during first paint.
  protected heroVideoSrc = signal<string | null>(null);
  protected heroVideoPlaying = signal(false);
  // Set only by the pause button. Hiding the tab also pauses the video, but
  // must not override a visitor who chose to stop it.
  protected heroVideoPausedByUser = signal(false);

  constructor() {
    afterNextRender(() => {
      if (!this.shouldLoadHeroVideo()) return;

      const load = () => this.heroVideoSrc.set(HERO_VIDEO_SRC);
      if (document.readyState === 'complete') {
        load();
      } else {
        window.addEventListener('load', load, { once: true });
        this.destroyRef.onDestroy(() => window.removeEventListener('load', load));
      }

      // Decoding video in a background tab burns battery for nobody.
      const onVisibilityChange = () => {
        const video = this.heroVideo()?.nativeElement;
        if (!video || this.heroVideoPausedByUser()) return;
        if (document.hidden) {
          video.pause();
        } else {
          video.play().catch(() => {});
        }
      };
      document.addEventListener('visibilitychange', onVisibilityChange);
      this.destroyRef.onDestroy(() =>
        document.removeEventListener('visibilitychange', onVisibilityChange),
      );
    });
  }

  ngOnInit(): void {
    // Ask the API for just the cards this page renders. Fetching the whole
    // catalogue and filtering here meant the entire product list was serialised
    // into the SSR transfer-state blob — at 1000 products that was ~300kB of
    // HTML to show a handful of items. The unfiltered follow-up only runs in the case
    // the previous code also covered: nothing is flagged as featured yet.
    this.productService
      .getAll({ featured: true, limit: FEATURED_COUNT })
      .pipe(
        switchMap((featured) =>
          featured.length > 0
            ? of(featured)
            : this.productService.getAll({ limit: FEATURED_COUNT }),
        ),
      )
      .subscribe({
        next: (products) => {
          // The API already applies the limit; slicing again keeps this page
          // correct if it ships ahead of an API that doesn't honour it yet,
          // since the two projects deploy independently.
          this.featured.set(products.slice(0, FEATURED_COUNT));
          this.loading.set(false);
        },
        // Without this the section showed "no products yet" when the API was
        // down, which is indistinguishable from an empty catalogue.
        error: () => {
          this.failed.set(true);
          this.loading.set(false);
        },
      });
  }

  protected onHeroVideoReady(video: HTMLVideoElement): void {
    // The element is created client-side, where the static `muted` attribute
    // does not set the property autoplay policies check — so set it here.
    video.muted = true;
    if (document.hidden || this.heroVideoPausedByUser()) return;
    video.play().catch(() => {});
  }

  protected toggleHeroVideo(): void {
    const video = this.heroVideo()?.nativeElement;
    if (!video) return;
    if (video.paused) {
      this.heroVideoPausedByUser.set(false);
      video.play().catch(() => {});
    } else {
      this.heroVideoPausedByUser.set(true);
      video.pause();
    }
  }

  private shouldLoadHeroVideo(): boolean {
    if (!window.matchMedia(HERO_VIDEO_MEDIA).matches) return false;
    const connection = (navigator as Navigator & { connection?: NetworkInformationLike })
      .connection;
    if (connection?.saveData) return false;
    return !/(^|-)2g$/.test(connection?.effectiveType ?? '');
  }
}
