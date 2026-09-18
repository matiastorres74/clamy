import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
  protected categoryLabel = categoryLabel;

  protected product = signal<Product | null>(null);
  protected loading = signal(true);
  protected notFound = signal(false);

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
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }
}
