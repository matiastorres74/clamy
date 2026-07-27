import { Component, inject, signal } from '@angular/core';
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
      error: () => {
        this.loading.set(false);
        this.error.set('Usuario o contraseña incorrectos.');
      },
    });
  }
}
