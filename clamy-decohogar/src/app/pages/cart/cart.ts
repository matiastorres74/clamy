import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart';
import { categoryLabel } from '../../core/models/product.model';
import { ArsCurrencyPipe, formatArsCurrency } from '../../shared/pipes/ars-currency.pipe';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-cart',
  imports: [RouterLink, ArsCurrencyPipe],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart {
  protected cart = inject(CartService);
  protected categoryLabel = categoryLabel;
  protected checkoutStarted = signal(false);

  decrement(productId: number, currentQty: number): void {
    if (currentQty <= 1) return;
    this.cart.updateQty(productId, currentQty - 1);
  }

  increment(productId: number, currentQty: number): void {
    this.cart.updateQty(productId, currentQty + 1);
  }

  remove(productId: number): void {
    this.cart.remove(productId);
  }

  checkoutOnWhatsApp(): void {
    const items = this.cart.cartItems();
    if (items.length === 0) return;

    const lines = items.map(
      (item) =>
        `• ${item.qty}x ${item.product.name} — ${formatArsCurrency(item.product.price * item.qty)}`,
    );
    const total = formatArsCurrency(this.cart.subtotal());

    const message = [
      'Hola! Quiero hacer este pedido desde la web de Clamy:',
      '',
      ...lines,
      '',
      `Total: ${total}`,
    ].join('\n');

    const url = `https://wa.me/${environment.whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener');
    this.checkoutStarted.set(true);
  }
}
