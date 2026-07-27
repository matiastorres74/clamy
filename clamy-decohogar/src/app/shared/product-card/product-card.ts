import { Component, input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product, categoryLabel } from '../../core/models/product.model';
import { CartService } from '../../core/services/cart';
import { ArsCurrencyPipe } from '../pipes/ars-currency.pipe';

@Component({
  selector: 'app-product-card',
  imports: [RouterLink, ArsCurrencyPipe],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
})
export class ProductCard {
  product = input.required<Product>();
  protected cart = inject(CartService);
  protected categoryLabel = categoryLabel;

  addToCart(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.cart.add(this.product());
  }
}
