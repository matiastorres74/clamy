import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!req.url.includes('/api/')) {
    return next(req);
  }

  const token = auth.getToken();
  const authed = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authed).pipe(
    catchError((err: unknown) => {
      // A 401 on a request that carried the admin token means the session is
      // gone (expired, or revoked by a JWT_SECRET change). Without this the
      // panel stayed open and every save failed with a generic message.
      // A 401 from /auth/login is just a wrong password, handled by its page.
      // Requests without a token never trigger this: an anonymous visitor
      // has no session to end, and during server rendering a 401 from
      // Vercel's Deployment Protection used to redirect the whole
      // storefront to /admin/login.
      if (
        token &&
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        !req.url.includes('/auth/login')
      ) {
        auth.logout();
        router.navigateByUrl('/admin/login');
      }
      return throwError(() => err);
    }),
  );
};
