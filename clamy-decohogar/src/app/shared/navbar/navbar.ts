import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../core/services/cart';
import { AuthService } from '../../core/services/auth';
import { CATEGORIES } from '../../core/models/product.model';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  protected cart = inject(CartService);
  protected auth = inject(AuthService);
  private router = inject(Router);

  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;

  protected categories = CATEGORIES;

  protected menuOpen = signal(false);
  protected searchOpen = signal(false);
  protected searchTerm = signal('');
  protected categoriesOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
    this.categoriesOpen.set(false);
  }

  toggleCategories(): void {
    this.categoriesOpen.update((v) => !v);
  }

  toggleSearch(): void {
    this.searchOpen.update((v) => !v);
    if (this.searchOpen()) {
      setTimeout(() => this.searchInput?.nativeElement.focus());
    }
  }

  submitSearch(): void {
    const term = this.searchTerm().trim();
    if (!term) return;
    this.router.navigate(['/productos'], { queryParams: { search: term } });
    this.searchOpen.set(false);
    this.searchTerm.set('');
  }
}
