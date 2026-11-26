# Clamy storefront

Angular 22 storefront and admin panel for Clamy, rendered on the server with
`@angular/ssr`. See the [project README](../README.md) for the overview, the stack and
how to run the whole thing.

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Dev server on `http://localhost:4200`, proxying `/api` to the API on `:3001` |
| `npm run build` | Production build, browser and server bundles, into `dist/` |
| `npm test` | Unit tests with Vitest |
| `npm run serve:ssr:clamy-decohogar` | Serve the built SSR app with Node |

## Where things live

```
src/app/pages/     Routed pages: home, product list and detail, admin login and dashboard
src/app/shared/    Navbar, footer, product card, pipes and image helpers
src/app/core/      Services, models, the admin guard and the auth interceptor
src/server.ts      SSR Express server: security headers, CSP nonce, cache headers, SEO files
```

`PERF.md` logs every performance experiment on the storefront with its measurements.
Read it before proposing one, so an idea that was already tried isn't run again.
