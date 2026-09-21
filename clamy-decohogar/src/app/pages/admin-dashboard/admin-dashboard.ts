import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { ProductService } from '../../core/services/product';
import { AuthService } from '../../core/services/auth';
import {
  CATEGORIES,
  CategoryId,
  Product,
  ProductInput,
  categoryLabel,
} from '../../core/models/product.model';
import { ArsCurrencyPipe } from '../../shared/pipes/ars-currency.pipe';

interface ProductFormState {
  id: number | null;
  name: string;
  description: string;
  price: number | null;
  category: CategoryId;
  featured: boolean;
  /** Photos already stored for this product, in display order. */
  images: string[];
}

/** A photo picked in this session but not uploaded yet. */
interface PendingImage {
  file: File;
  /** Object URL for the preview; revoked when the entry is dropped. */
  previewUrl: string;
}

// Mirrors the multer limit in server/src/routes/upload.ts so an oversized
// photo is rejected before a mobile connection spends time uploading it.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// Mirrors MAX_IMAGES in server/src/routes/products.ts.
const MAX_IMAGES = 12;

// Same rules the API applies in multer; null means the file is acceptable.
function rejectReason(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return `"${file.name}" no es una imagen (JPG, PNG, WEBP o GIF).`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `"${file.name}" supera los 5 MB.`;
  }
  return null;
}

function emptyForm(): ProductFormState {
  return {
    id: null,
    name: '',
    description: '',
    price: null,
    category: 'lighting',
    featured: false,
    images: [],
  };
}

@Component({
  selector: 'app-admin-dashboard',
  imports: [FormsModule, ArsCurrencyPipe],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private auth = inject(AuthService);
  private router = inject(Router);

  protected categories = CATEGORIES;
  protected categoryLabel = categoryLabel;
  protected maxImages = MAX_IMAGES;
  protected products = signal<Product[]>([]);
  protected loading = signal(true);
  protected showForm = signal(false);
  protected form: ProductFormState = emptyForm();
  protected pending = signal<PendingImage[]>([]);
  protected dragOver = signal(false);
  protected saving = signal(false);
  protected error = signal<string | null>(null);

  ngOnInit(): void {
    this.fetchProducts();
  }

  ngOnDestroy(): void {
    this.clearPending();
  }

  private fetchProducts(): void {
    this.loading.set(true);
    this.productService.getAll().subscribe({
      next: (products) => {
        this.products.set(products);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // The panel is toggled with a signal rather than a route change, so the
  // router's scroll handling never fires here: opening the form from halfway
  // down the product table left it off-screen above the viewport. The panel
  // renders directly under the page header, so scrolling the window to the
  // top reveals it. The scroll is deferred to the next task because inserting
  // the panel above the current position makes the browser's scroll anchoring
  // restore the old offset, which cancels a scroll started in the same tick,
  // and it jumps rather than animating because a smooth scroll starting from
  // the same tick as that insertion was getting cancelled part-way.
  private revealForm(): void {
    this.showForm.set(true);
    setTimeout(() => window.scrollTo(0, 0));
  }

  openCreateForm(): void {
    this.form = emptyForm();
    this.clearPending();
    this.error.set(null);
    this.revealForm();
  }

  openEditForm(product: Product): void {
    this.form = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price ?? null,
      category: product.category,
      featured: product.featured,
      images: [...product.images],
    };
    this.clearPending();
    this.error.set(null);
    this.revealForm();
  }

  closeForm(): void {
    this.clearPending();
    this.showForm.set(false);
  }

  /** Photos currently attached: stored ones plus this session's picks. */
  protected totalImages(): number {
    return this.form.images.length + this.pending().length;
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addFiles(input.files);
    // Reset so picking the same file again still fires `change`.
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    this.addFiles(event.dataTransfer?.files ?? null);
  }

  removeStoredImage(index: number): void {
    this.form.images = this.form.images.filter((_, i) => i !== index);
  }

  /** Moves a stored photo to the front so it becomes the card cover. */
  makeCover(index: number): void {
    if (index === 0) return;
    const images = [...this.form.images];
    const [chosen] = images.splice(index, 1);
    this.form.images = [chosen, ...images];
  }

  removePending(index: number): void {
    const entry = this.pending()[index];
    if (entry) URL.revokeObjectURL(entry.previewUrl);
    this.pending.update((list) => list.filter((_, i) => i !== index));
  }

  formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Validates each pick with the same rules the API enforces and queues the
  // accepted ones with a preview. Stops at the photo cap with a message
  // rather than silently dropping the extras.
  private addFiles(files: FileList | null): void {
    if (!files || files.length === 0) return;
    const accepted: PendingImage[] = [];
    const problems: string[] = [];

    for (const file of Array.from(files)) {
      if (this.totalImages() + accepted.length >= MAX_IMAGES) {
        problems.push(`Podés cargar hasta ${MAX_IMAGES} fotos por producto.`);
        break;
      }
      const reason = rejectReason(file);
      if (reason) {
        problems.push(reason);
        continue;
      }
      accepted.push({ file, previewUrl: URL.createObjectURL(file) });
    }

    this.pending.update((list) => [...list, ...accepted]);
    // Every rejection is reported, not just the last one, so a mixed pick
    // (one too big, one not an image) explains both.
    this.error.set(problems.length > 0 ? problems.join(' ') : null);
  }

  // Object URLs hold the file in memory until released, which adds up on a
  // phone if the admin cycles through several photos before saving.
  private clearPending(): void {
    for (const entry of this.pending()) URL.revokeObjectURL(entry.previewUrl);
    this.pending.set([]);
  }

  save(): void {
    const f = this.form;
    if (!f.name.trim() || f.price === null || f.price < 0) {
      this.error.set('Completá nombre y precio antes de guardar.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    // Upload every new photo first, then persist the product with the full
    // list (kept stored photos + new URLs) in display order. The uploaded
    // URLs are moved into the form *before* persisting, so if the save itself
    // fails a retry reuses them instead of uploading the same files again.
    const uploads = this.pending().map((entry) => this.productService.uploadImage(entry.file));
    (uploads.length > 0 ? forkJoin(uploads) : of([])).subscribe({
      next: (results) => {
        f.images = [...f.images, ...results.map((r) => r.imageUrl)];
        this.clearPending();
        this.persist(f, f.images);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo subir alguna de las imágenes.');
      },
    });
  }

  private persist(f: ProductFormState, images: string[]): void {
    const payload: ProductInput = {
      name: f.name.trim(),
      description: f.description,
      price: f.price as number,
      category: f.category,
      featured: f.featured,
      images,
    };

    const request = f.id
      ? this.productService.update(f.id, payload)
      : this.productService.create(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.fetchProducts();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo guardar el producto.');
      },
    });
  }

  remove(product: Product): void {
    if (!confirm(`¿Eliminar "${product.name}"?`)) return;
    this.productService.delete(product.id).subscribe(() => this.fetchProducts());
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/admin/login');
  }
}
