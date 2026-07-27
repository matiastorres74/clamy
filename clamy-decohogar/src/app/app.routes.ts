import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { ProductList } from './pages/product-list/product-list';
import { ProductDetail } from './pages/product-detail/product-detail';
import { Cart } from './pages/cart/cart';
import { AdminLogin } from './pages/admin-login/admin-login';
import { AdminDashboard } from './pages/admin-dashboard/admin-dashboard';
import { NotFound } from './pages/not-found/not-found';
import { adminGuard } from './core/guards/admin-guard';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'productos', component: ProductList },
  { path: 'productos/:id', component: ProductDetail },
  { path: 'carrito', component: Cart },
  { path: 'admin/login', component: AdminLogin },
  { path: 'admin', component: AdminDashboard, canActivate: [adminGuard] },
  { path: '**', component: NotFound },
];
