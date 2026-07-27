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

@Service()
export class AuthService {
  private http = inject(HttpClient);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly isLoggedIn = signal(!!this.getToken());
  readonly username = signal(this.getStoredUsername());

  getToken(): string | null {
    return this.isBrowser ? localStorage.getItem(TOKEN_KEY) : null;
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
    if (this.isBrowser) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USERNAME_KEY);
    }
    this.isLoggedIn.set(false);
    this.username.set(null);
  }
}
