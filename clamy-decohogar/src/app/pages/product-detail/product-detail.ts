import {
  Component,
  ElementRef,
  OnInit,
  RESPONSE_INIT,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductService } from '../../core/services/product';
import { Product } from '../../core/models/product.model';
import { CategoryService } from '../../core/services/category';
import { environment } from '../../../environments/environment';
import { imageSrc, imageSrcset } from '../../shared/image-url';

@Component({
  selector: 'app-product-detail',
  imports: [RouterLink],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private responseInit = inject(RESPONSE_INIT, { optional: true });
  private categoryService = inject(CategoryService);
  protected categoryLabel = (id: string) => this.categoryService.label(id);

  @ViewChild('track') private track?: ElementRef<HTMLElement>;

  protected product = signal<Product | null>(null);
  protected loading = signal(true);
  protected notFound = signal(false);
  protected failed = signal(false);

  protected images = computed(() => this.product()?.images ?? []);
  protected activeIndex = signal(0);
  protected imageSrc = imageSrc;
  protected imageSrcset = imageSrcset;

  // Slides that already have an <img>. A slide is mounted once the visitor
  // reaches it or a neighbour, and stays mounted so swiping back never
  // re-requests or flashes an empty frame.
  private mountedSlides = signal<ReadonlySet<number>>(new Set([0, 1]));

  protected isSlideMounted(index: number): boolean {
    return this.mountedSlides().has(index);
  }

  private mountAround(index: number): void {
    const total = this.images().length;
    if (total === 0) return;
    const wanted = [index, (index + 1) % total, (index - 1 + total) % total];
    const current = this.mountedSlides();
    if (wanted.every((i) => current.has(i))) return;
    this.mountedSlides.set(new Set([...current, ...wanted]));
  }

  // The inquiry opens WhatsApp with the product already named, so the shop
  // knows what the visitor is asking about without them retyping it. The id
  // doubles as a reference the admin can look up.
  protected whatsappUrl = computed(() => {
    const base = `https://wa.me/${environment.whatsappNumber}`;
    const p = this.product();
    if (!p) return base;
    const message =
      `Hola! Vi "${p.name}" (ref. #${p.id}) en el showroom de Clamy ` +
      'y quiero consultar por este producto.';
    return `${base}?text=${encodeURIComponent(message)}`;
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.productService.getById(id).subscribe({
      next: (product) => {
        this.product.set(product);
        this.loading.set(false);
      },
      // Only the API's 404 (or 400 for a non-numeric id) means the product
      // doesn't exist; anything else is an outage, which used to be reported
      // as "we couldn't find this product".
      error: (err: unknown) => {
        const status = err instanceof HttpErrorResponse ? err.status : 0;
        if (status === 404 || status === 400) {
          this.notFound.set(true);
          // Server-side only (null in the browser): without this a deleted
          // product's URL answered 200 and stayed indexed by search engines.
          if (this.responseInit) this.responseInit.status = 404;
        } else {
          this.failed.set(true);
          // Server-side only: a 503 keeps the CDN from caching the error
          // page for every visitor after a momentary API failure.
          if (this.responseInit) this.responseInit.status = 503;
        }
        this.loading.set(false);
      },
    });
  }

  // The track is a CSS scroll-snap strip, so on touch devices swiping just
  // works and this only has to keep the index in sync and drive the arrows
  // and thumbnails.
  goTo(index: number): void {
    const total = this.images().length;
    if (total === 0) return;
    const next = (index + total) % total;
    const el = this.track?.nativeElement;
    // Mounted before scrolling, so the target photo is already loading while
    // the smooth scroll runs instead of after it lands.
    this.mountAround(next);
    if (el) {
      this.scrollTarget = next;
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    }
    this.activeIndex.set(next);
  }

  // Set while goTo()'s smooth scroll is running. Its scroll events pass over
  // every slide between start and target; mounting each of them meant that
  // tapping the last thumbnail loaded all twelve photos.
  private scrollTarget: number | null = null;

  onTrackScroll(): void {
    const el = this.track?.nativeElement;
    if (!el || el.clientWidth === 0) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    if (this.scrollTarget !== null) {
      if (index !== this.scrollTarget) return;
      this.scrollTarget = null;
    }
    this.mountAround(index);
    this.activeIndex.set(index);
  }

  // A swipe that interrupts a smooth scroll never reaches its target, so the
  // visitor's own scrolling takes over from here.
  onTrackPointerDown(): void {
    this.scrollTarget = null;
  }
}
