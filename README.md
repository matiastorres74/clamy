# Clamy

Online showroom for **Clamy**, a family business in Argentina that sells and repairs
lighting fixtures and home decoration. Visitors browse the catalogue by category and
search it; the owners manage products, photos and categories from a private admin
panel.

**Live site:** [clamy-web.vercel.app](https://clamy-web.vercel.app)

The storefront is in Spanish, since that is who it serves.

## Stack

| Layer | Technology |
|---|---|
| Storefront | Angular 22 with server-side rendering (`@angular/ssr`), standalone components and signals |
| API | Node.js, Express, TypeScript, Zod for input validation |
| Database | PostgreSQL (Neon) through Prisma |
| Images | Vercel Blob for uploads, served through Vercel Image Optimization |
| Auth | Admin-only JWT, bcrypt password hashes, login rate limiting on Upstash Redis |
| Hosting | Vercel: two projects, one for the storefront and one for the API |
| CI | GitHub Actions: build, type check, tests and a dependency audit gate on every PR |

## Repository layout

```
clamy-decohogar/   Angular storefront and admin panel, plus its SSR Express server
server/            REST API, Prisma schema, migrations and seed
.github/           CI workflow and the audit gate script
docker-compose.yml Optional self-hosted setup (API + storefront behind nginx)
nginx.conf         Reverse proxy config used by docker-compose
```

## Features

- **Catalogue:** categories, search that ignores case and accents, and featured products on
  the home page.
- **Product pages:** a swipeable photo gallery with several photos per product.
- **Admin panel:** create, edit and delete products, upload photos, mark products as
  featured, and add, rename, reorder and remove categories.
- **Showroom mode:** prices are stored and visible to the admin, but the public API strips
  them, so they never reach anonymous visitors.
- **Seasonal touch:** a snowfall effect and the Christmas category stand out from mid-November
  to early January.

## Engineering highlights

- **Security.** The SSR server sends a nonce-based Content Security Policy and hardened
  headers, and the admin is `noindex`. Login takes the same time whether or not the
  username exists, and it is rate limited across serverless instances. Uploads accept only
  JPEG, PNG, WEBP or GIF up to 5 MB. The API trusts exactly one proxy hop and answers
  malformed JSON with a 400.
- **Caching.** Anonymous catalogue reads are cached at the CDN and in Vercel's Runtime
  Cache, with tag-based invalidation whenever the admin changes data. Admin requests stay
  `private, no-store`, and `Vary: Authorization` keeps them off the shared copy. Pages
  rendered while the API is failing return 503, and only 200/404 pages are cached.
- **Performance.** Every page is lazy loaded, so the initial bundle carries only what a
  visitor needs. The hero photo loads before its video. Product photos go through image
  optimization with `srcset`; on the home page that took six featured photos from 6.6 MB
  to 248 KB. Every experiment, kept or reverted, is logged with its numbers in
  [`clamy-decohogar/PERF.md`](clamy-decohogar/PERF.md).
- **SEO.** Server-rendered pages, a generated `sitemap.xml` and `robots.txt`, and real 404
  status codes instead of soft 404s.
- **Deploys.** Database migrations run only on production deploys, so preview builds
  never alter the schema.

## Running locally

Requirements: Node.js 22+, a PostgreSQL database, and a Vercel Blob token for photo
uploads.

**1. API**

```bash
cd server
cp .env.example .env      # fill in DATABASE_URL, DIRECT_URL, JWT_SECRET, ADMIN_*, BLOB_READ_WRITE_TOKEN
npm install
npx prisma migrate dev    # creates the schema
npm run prisma:seed       # creates the admin user from ADMIN_USERNAME / ADMIN_PASSWORD
npm run dev               # http://localhost:3001
```

Login rate limiting needs `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Without
them the API still runs, logs a warning and leaves login unthrottled.

**2. Storefront**

```bash
cd clamy-decohogar
npm install
npm start                 # http://localhost:4200, proxies /api to the API on :3001
```

The admin panel is at `/admin/login`.

## Tests

```bash
cd server && npm test            # API tests (Vitest + Supertest, against Postgres)
cd clamy-decohogar && npm test   # storefront unit tests (Vitest)
```

CI runs both suites, plus the production build, a type check and a dependency audit, on
every pull request.
