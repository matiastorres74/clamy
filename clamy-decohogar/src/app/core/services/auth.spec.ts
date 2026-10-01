import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from './auth';

/** An unsigned JWT is enough: the client only reads `exp`, the API verifies. */
function fakeJwt(expSecondsFromNow: number): string {
  const b64url = (o: object) =>
    btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const exp = Math.floor(Date.now() / 1000) + expSecondsFromNow;
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ id: 1, username: 'admin', exp })}.sig`;
}

describe('AuthService', () => {
  function setup(token: string | null): AuthService {
    localStorage.clear();
    if (token) {
      localStorage.setItem('clamy_admin_token', token);
      localStorage.setItem('clamy_admin_username', 'admin');
    }
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return TestBed.inject(AuthService);
  }

  afterEach(() => localStorage.clear());

  it('keeps a token that has not expired', () => {
    const token = fakeJwt(3600);
    const auth = setup(token);

    expect(auth.getToken()).toBe(token);
    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.hasValidSession()).toBe(true);
  });

  it('treats an expired token as logged out and clears it', () => {
    const auth = setup(fakeJwt(-60));

    expect(auth.getToken()).toBeNull();
    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('clamy_admin_token')).toBeNull();
  });

  it('notices a token that expires while the app is open', () => {
    const auth = setup(fakeJwt(3600));
    localStorage.setItem('clamy_admin_token', fakeJwt(-1));

    expect(auth.hasValidSession()).toBe(false);
    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.username()).toBeNull();
  });

  it('rejects a malformed token', () => {
    const auth = setup('not-a-jwt');

    expect(auth.getToken()).toBeNull();
  });
});
