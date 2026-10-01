import { Service, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'clamy_admin_token';
const USERNAME_KEY = 'clamy_admin_username';

interface LoginResponse {
  token: string;
  username: string;
}

// The API issues 8h tokens. Reading `exp` here (no signature check — the API
// still verifies every request) lets the app notice a stale session itself,
// instead of showing a logged-in admin whose every save comes back 401.
function isExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

@Service()
export class AuthService {
  private http = inject(HttpClient);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly isLoggedIn = signal(!!this.getToken());
  readonly username = signal(this.getStoredUsername());

  getToken(): string | null {
    if (!this.isBrowser) return null;
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && isExpired(token)) {
      this.clearStorage();
      return null;
    }
    return token;
  }

  /** Re-checks expiry (isLoggedIn alone can outlive the token) and syncs the signals. */
  hasValidSession(): boolean {
    const valid = this.getToken() !== null;
    if (!valid && this.isLoggedIn()) this.logout();
    return valid;
  }

  private clearStorage(): void {
    if (this.isBrowser) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USERNAME_KEY);
    }
  }

  private getStoredUsername(): string | null {
    return this.isBrowser ? localStorage.getItem(USERNAME_KEY) : null;
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { username, password })
      .pipe(
        tap((res) => {
          if (this.isBrowser) {
            localStorage.setItem(TOKEN_KEY, res.token);
            localStorage.setItem(USERNAME_KEY, res.username);
          }
          this.isLoggedIn.set(true);
          this.username.set(res.username);
        }),
      );
  }

  logout(): void {
    this.clearStorage();
    this.isLoggedIn.set(false);
    this.username.set(null);
  }
}
