import { Service, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Category } from '../models/product.model';

// One shared list for the navbar, home, catalogue and admin. Loaded once per
// app instance (the GET also rides the SSR transfer cache), and refreshed by
// the admin's writes so every menu reflects an edit without a reload.
@Service()
export class CategoryService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/categories`;
  private request$?: Observable<Category[]>;

  readonly categories = signal<Category[]>([]);

  /** Fetches the list the first time it is called; later calls reuse it. */
  load(): Observable<Category[]> {
    this.request$ ??= this.http.get<Category[]>(this.baseUrl).pipe(
      tap((list) => this.categories.set(list)),
      // A failed load leaves menus empty instead of breaking the page, and
      // clears the cache so the next caller tries again.
      catchError(() => {
        this.request$ = undefined;
        return of([] as Category[]);
      }),
      shareReplay(1),
    );
    return this.request$;
  }

  /** Re-reads the list from the API, bypassing the cache. */
  reload(): Observable<Category[]> {
    this.request$ = undefined;
    return this.load();
  }

  label(id: string): string {
    return this.categories().find((c) => c.id === id)?.label ?? id;
  }

  create(label: string): Observable<Category> {
    return this.http.post<Category>(this.baseUrl, { label });
  }

  rename(id: string, label: string): Observable<Category> {
    return this.http.put<Category>(`${this.baseUrl}/${encodeURIComponent(id)}`, { label });
  }

  reorder(ids: string[]): Observable<Category[]> {
    return this.http
      .put<Category[]>(`${this.baseUrl}/order`, { ids })
      .pipe(tap((list) => this.categories.set(list)));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }
}
