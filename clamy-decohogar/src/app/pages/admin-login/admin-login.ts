import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-admin-login',
  imports: [FormsModule],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.css',
})
export class AdminLogin {
  private auth = inject(AuthService);
  private router = inject(Router);

  protected username = signal('');
  protected password = signal('');
  protected error = signal<string | null>(null);
  protected loading = signal(false);

  submit(): void {
    this.error.set(null);
    this.loading.set(true);
    this.auth.login(this.username(), this.password()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/admin');
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(loginErrorMessage(err));
      },
    });
  }
}

// Every failure used to read "wrong password", including the rate limiter's
// 429. An admin who was locked out kept retrying, which only extended the
// lockout, and an API outage looked like a forgotten password.
function loginErrorMessage(err: unknown): string {
  const status = err instanceof HttpErrorResponse ? err.status : 0;
  if (status === 401) return 'Usuario o contraseña incorrectos.';
  if (status === 429) {
    return 'Demasiados intentos. Esperá unos minutos antes de volver a probar.';
  }
  if (status === 0) return 'No pudimos conectar con el servidor. Revisá tu conexión.';
  return 'El servidor no respondió como esperábamos. Probá de nuevo en un rato.';
}
