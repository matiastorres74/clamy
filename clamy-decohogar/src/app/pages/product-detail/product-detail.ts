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
import { categoryLabel, Product } from '../../core/models/product.model';
import { environment } from '../../../environments/environment';

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
  protected categoryLabel = categoryLabel;

  @ViewChild('track') private track?: ElementRef<HTMLElement>;

  protected product = signal<Product | null>(null);
  protected loading = signal(true);
  protected notFound = signal(false);
  protected failed = signal(false);

  protected images = computed(() => this.product()?.images ?? []);
  protected activeIndex = signal(0);

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
    if (el) {
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    }
    this.activeIndex.set(next);
  }

  onTrackScroll(): void {
    const el = this.track?.nativeElement;
    if (!el || el.clientWidth === 0) return;
    this.activeIndex.set(Math.round(el.scrollLeft / el.clientWidth));
  }
}
