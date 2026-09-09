import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin-guard';

// Every page is loaded on demand so the initial bundle carries only what an
// anonymous visitor actually needs. The admin dashboard in particular pulls in
// FormsModule and the upload flow, which no storefront visitor ever runs.
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'productos',
    loadComponent: () =>
      import('./pages/product-list/product-list').then((m) => m.ProductList),
  },
  {
    path: 'productos/:id',
    loadComponent: () =>
      import('./pages/product-detail/product-detail').then((m) => m.ProductDetail),
  },
  {
    path: 'carrito',
    loadComponent: () => import('./pages/cart/cart').then((m) => m.Cart),
  },
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./pages/admin-login/admin-login').then((m) => m.AdminLogin),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./pages/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard),
    canActivate: [adminGuard],
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFound),
  },
];
