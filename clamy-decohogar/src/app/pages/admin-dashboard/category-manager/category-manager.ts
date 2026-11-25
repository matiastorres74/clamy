import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CategoryService } from '../../../core/services/category';
import { Category } from '../../../core/models/product.model';

@Component({
  selector: 'app-category-manager',
  imports: [FormsModule],
  templateUrl: './category-manager.html',
  styleUrl: './category-manager.css',
})
export class CategoryManager {
  private service = inject(CategoryService);

  /** Products per category id, so the list can say which ones are in use. */
  productCounts = input<Record<string, number>>({});

  protected categories = this.service.categories;
  /** Label drafts being edited, keyed by category id. */
  protected drafts = signal<Record<string, string>>({});
  protected newLabel = signal('');
  protected busy = signal(false);
  protected error = signal<string | null>(null);

  protected draft(cat: Category): string {
    return this.drafts()[cat.id] ?? cat.label;
  }

  protected setDraft(cat: Category, value: string): void {
    this.drafts.update((d) => ({ ...d, [cat.id]: value }));
  }

  protected isDirty(cat: Category): boolean {
    const value = this.drafts()[cat.id];
    return value !== undefined && value.trim() !== cat.label && value.trim().length > 0;
  }

  protected count(cat: Category): number {
    return this.productCounts()[cat.id] ?? 0;
  }

  add(): void {
    const label = this.newLabel().trim();
    if (!label) return;
    this.run(this.service.create(label), () => this.newLabel.set(''), {
      409: `Ya existe una categoría llamada "${label}".`,
      default: 'No se pudo crear la categoría.',
    });
  }

  rename(cat: Category): void {
    const label = this.draft(cat).trim();
    if (!label || label === cat.label) return;
    this.run(
      this.service.rename(cat.id, label),
      () => this.drafts.update(({ [cat.id]: _done, ...rest }) => rest),
      { default: 'No se pudo renombrar la categoría.' },
    );
  }

  move(index: number, step: number): void {
    const ids = this.categories().map((c) => c.id);
    const target = index + step;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    this.run(this.service.reorder(ids), () => {}, {
      default: 'No se pudo cambiar el orden. Recargá la página y probá de nuevo.',
    });
  }

  remove(cat: Category): void {
    if (!confirm(`¿Eliminar la categoría "${cat.label}"?`)) return;
    this.run(this.service.delete(cat.id), () => {}, {
      409: `"${cat.label}" todavía tiene productos. Pasalos a otra categoría antes de eliminarla.`,
      default: `No se pudo eliminar "${cat.label}".`,
    });
  }

  // Every write ends by re-reading the list, so the navbar, the catalogue
  // chips and the product form all pick up the change at once.
  private run(
    request: Observable<unknown>,
    onSuccess: () => void,
    messages: { default: string; [status: number]: string },
  ): void {
    this.busy.set(true);
    this.error.set(null);
    request.subscribe({
      next: () => {
        onSuccess();
        this.service.reload().subscribe(() => this.busy.set(false));
      },
      error: (err: unknown) => {
        const status = err instanceof HttpErrorResponse ? err.status : 0;
        this.error.set(messages[status] ?? messages.default);
        this.busy.set(false);
      },
    });
  }
}
