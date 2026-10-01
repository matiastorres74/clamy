import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { authInterceptor } from './auth-interceptor';
import { AuthService } from '../services/auth';

function fakeJwt(expSecondsFromNow: number): string {
  const b64url = (o: object) =>
    btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const exp = Math.floor(Date.now() / 1000) + expSecondsFromNow;
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ id: 1, username: 'admin', exp })}.sig`;
}

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: AuthService;
  let navigateByUrl: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('clamy_admin_token', fakeJwt(3600));
    localStorage.setItem('clamy_admin_username', 'admin');
    navigateByUrl = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigateByUrl } },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    backend.verify();
    localStorage.clear();
  });

  it('attaches the bearer token to API calls', () => {
    http.get('/api/products').subscribe();
    const req = backend.expectOne('/api/products');
    expect(req.request.headers.get('Authorization')).toMatch(/^Bearer /);
    req.flush([]);
  });

  it('logs out and returns to the login page when the API rejects the session', () => {
    let failed = false;
    http.put('/api/products/1', {}).subscribe({ error: () => (failed = true) });
    backend
      .expectOne('/api/products/1')
      .flush({ error: 'Invalid or expired token' }, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBe(true);
    expect(auth.isLoggedIn()).toBe(false);
    expect(navigateByUrl).toHaveBeenCalledWith('/admin/login');
  });

  it('leaves a wrong password on the login page to its own handler', () => {
    http.post('/api/auth/login', {}).subscribe({ error: () => undefined });
    backend
      .expectOne('/api/auth/login')
      .flush({ error: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isLoggedIn()).toBe(true);
    expect(navigateByUrl).not.toHaveBeenCalled();
  });
});
