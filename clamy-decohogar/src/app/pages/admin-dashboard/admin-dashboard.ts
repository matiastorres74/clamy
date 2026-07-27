import { Component, OnInit, inject, signal } from '@angular/core';
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
export class AdminDashboard implements OnInit {
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
  protected saving = signal(false);
  protected error = signal<string | null>(null);

  ngOnInit(): void {
    this.fetchProducts();
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
    this.selectedFile.set(null);
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
    this.selectedFile.set(null);
    this.error.set(null);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
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
