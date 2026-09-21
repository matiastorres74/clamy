import {
  Component,
  ElementRef,
  HostListener,
  Injector,
  ViewChild,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth';
import { CATEGORIES } from '../../core/models/product.model';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  protected auth = inject(AuthService);
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);
  private injector = inject(Injector);

  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('categoriesTrigger') private categoriesTrigger?: ElementRef<HTMLButtonElement>;
  @ViewChild('categoriesMenu') private categoriesMenu?: ElementRef<HTMLElement>;
  @ViewChild('menuToggle') private menuToggle?: ElementRef<HTMLButtonElement>;
  @ViewChild('mobileNav') private mobileNav?: ElementRef<HTMLElement>;

  protected categories = CATEGORIES;

  protected menuOpen = signal(false);
  protected searchOpen = signal(false);
  protected searchTerm = signal('');
  protected categoriesOpen = signal(false);

  // Both panels are plain overlays, so a click anywhere else should dismiss
  // them the way a native menu would. Clicks on the triggers themselves land
  // inside the host and are left to their own handlers.
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.host.nativeElement.contains(event.target as Node)) return;
    this.categoriesOpen.set(false);
    this.menuOpen.set(false);
  }

  // Escape closes the innermost open panel and hands focus back to whatever
  // opened it, so keyboard users aren't left focused on a hidden element.
  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.categoriesOpen()) {
      this.categoriesOpen.set(false);
      this.focus(this.categoriesTrigger);
      return;
    }
    if (this.menuOpen()) {
      this.menuOpen.set(false);
      this.focus(this.menuToggle);
      return;
    }
    if (this.searchOpen()) {
      this.searchOpen.set(false);
    }
  }

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
    if (this.menuOpen()) {
      this.afterRender(() => this.focusFirstLink(this.mobileNav));
    }
  }

  closeMenu(): void {
    this.menuOpen.set(false);
    this.categoriesOpen.set(false);
  }

  toggleCategories(): void {
    this.categoriesOpen.update((v) => !v);
  }

  /** Opens the dropdown from the trigger and moves into it, for arrow keys. */
  openCategoriesFromKeyboard(event: Event): void {
    event.preventDefault();
    this.categoriesOpen.set(true);
    this.afterRender(() => this.focusFirstLink(this.categoriesMenu));
  }

  // The app runs zoneless, so a plain setTimeout can fire before Angular has
  // applied the signal change to the DOM — and a panel that is still
  // `visibility: hidden` silently ignores focus(). This waits for the render.
  private afterRender(fn: () => void): void {
    afterNextRender(fn, { injector: this.injector });
  }

  /** Walks the dropdown links with the arrow keys, wrapping at both ends. */
  moveCategoryFocus(event: Event, step: number): void {
    const links = this.categoryLinks();
    if (links.length === 0) return;
    event.preventDefault();
    const current = links.indexOf(document.activeElement as HTMLElement);
    const next = (current + step + links.length) % links.length;
    links[next].focus();
  }

  private categoryLinks(): HTMLElement[] {
    const menu = this.categoriesMenu?.nativeElement;
    return menu ? Array.from(menu.querySelectorAll<HTMLElement>('a')) : [];
  }

  private focusFirstLink(container?: ElementRef<HTMLElement>): void {
    container?.nativeElement.querySelector<HTMLElement>('a')?.focus();
  }

  private focus(ref?: ElementRef<HTMLElement>): void {
    ref?.nativeElement.focus();
  }

  toggleSearch(): void {
    this.searchOpen.update((v) => !v);
    if (this.searchOpen()) {
      this.afterRender(() => this.searchInput?.nativeElement.focus());
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
