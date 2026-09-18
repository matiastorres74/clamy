import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  imageUrl: string | null;
}

// Mirrors the multer limit in server/src/routes/upload.ts so an oversized
// photo is rejected before a mobile connection spends time uploading it.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function emptyForm(): ProductFormState {
  return {
    id: null,
    name: '',
    description: '',
    price: null,
    category: 'lighting',
    featured: false,
    imageUrl: null,
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
  protected products = signal<Product[]>([]);
  protected loading = signal(true);
  protected showForm = signal(false);
  protected form: ProductFormState = emptyForm();
  protected selectedFile = signal<File | null>(null);
  // Object URL for the file the admin just picked. On a phone the native
  // input shows little more than a filename, so without this there is no
  // confirmation that the right photo was chosen before saving.
  protected previewUrl = signal<string | null>(null);
  protected dragOver = signal(false);
  protected saving = signal(false);
  protected error = signal<string | null>(null);

  ngOnInit(): void {
    this.fetchProducts();
  }

  ngOnDestroy(): void {
    this.revokePreview();
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

  openCreateForm(): void {
    this.form = emptyForm();
    this.setSelectedFile(null);
    this.error.set(null);
    this.showForm.set(true);
  }

  openEditForm(product: Product): void {
    this.form = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      featured: product.featured,
      imageUrl: product.imageUrl,
    };
    this.setSelectedFile(null);
    this.error.set(null);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.setSelectedFile(null);
    this.showForm.set(false);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!this.setSelectedFile(input.files?.[0] ?? null)) {
      // Clear the native control after a rejected pick, otherwise choosing the
      // same file again doesn't fire `change` and the admin gets no feedback.
      input.value = '';
    }
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
    this.setSelectedFile(event.dataTransfer?.files?.[0] ?? null);
  }

  clearSelectedFile(input: HTMLInputElement): void {
    input.value = '';
    this.setSelectedFile(null);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Validates the pick client-side with the same rules the API enforces and
  // swaps the preview. Returns whether the file was accepted.
  private setSelectedFile(file: File | null): boolean {
    this.revokePreview();

    if (file && !file.type.startsWith('image/')) {
      this.selectedFile.set(null);
      this.error.set('Elegí un archivo de imagen (JPG, PNG, WEBP o GIF).');
      return false;
    }
    if (file && file.size > MAX_IMAGE_BYTES) {
      this.selectedFile.set(null);
      this.error.set('La imagen supera los 5 MB. Probá con una más liviana.');
      return false;
    }

    this.error.set(null);
    this.selectedFile.set(file);
    if (file) {
      this.previewUrl.set(URL.createObjectURL(file));
    }
    return true;
  }

  // Object URLs hold the file in memory until released, which adds up on a
  // phone if the admin cycles through several photos before saving.
  private revokePreview(): void {
    const url = this.previewUrl();
    if (url) {
      URL.revokeObjectURL(url);
      this.previewUrl.set(null);
    }
  }

  save(): void {
    const f = this.form;
    if (!f.name.trim() || f.price === null || f.price < 0) {
      this.error.set('Completá nombre y precio antes de guardar.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const file = this.selectedFile();
    if (file) {
      this.productService.uploadImage(file).subscribe({
        next: (res) => this.persist(f, res.imageUrl),
        error: () => {
          this.saving.set(false);
          this.error.set('No se pudo subir la imagen.');
        },
      });
    } else {
      this.persist(f, f.imageUrl);
    }
  }

  private persist(f: ProductFormState, imageUrl: string | null): void {
    const payload: ProductInput = {
      name: f.name.trim(),
      description: f.description,
      price: f.price as number,
      category: f.category,
      featured: f.featured,
      imageUrl,
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
