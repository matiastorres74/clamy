import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'admin',
    renderMode: RenderMode.Client,
  },
  {
    path: 'admin/login',
    renderMode: RenderMode.Client,
  },
  // Every real storefront page is listed so that the catch-all below only
  // ever matches URLs the app has no page for. Before, '**' was the only
  // server route and served everything, so unknown URLs answered 200 and
  // search engines indexed the "not found" page as content.
  {
    path: '',
    renderMode: RenderMode.Server,
  },
  {
    path: 'productos',
    renderMode: RenderMode.Server,
  },
  // A missing product still matches this route; ProductDetail sets the 404
  // itself once the API says so.
  {
    path: 'productos/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: '**',
    renderMode: RenderMode.Server,
    status: 404,
  },
];
