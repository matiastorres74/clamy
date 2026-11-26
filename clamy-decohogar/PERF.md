# Performance log

Every optimisation tried on the storefront, kept or reverted, with the numbers
that decided it. Read this before proposing one, so a dead idea is not re-run.

Unless a row says otherwise, measurements are Chrome DevTools, mobile 412px at
DPR 2.6, Slow 4G, CPU 4x, browser cache disabled, against production
(`clamy-web.vercel.app`) for the baseline and the branch preview for the
result. Two runs each.

## 2026-11-26 (branch `perf/storefront`)

| Idea | Baseline → Result | Verdict | Why |
|---|---|---|---|
| Product photos through Vercel Image Optimization (`srcset`/`sizes`, AVIF) | Home, 6 featured photos: 6,616 KB → 248 KB | kept | Originals were iPhone JPEGs (1179x2096) and PNGs up to 2.9 MB, shown ~174px wide. |
| Gallery mounts only the photo on screen and its neighbours; 128px thumbnails | `/productos/69` images: 10,562 KB (12 originals) → 185 KB (2 slides + 12 thumbs). LCP 56.8 s / 56.8 s → 5.3 s / 3.8 s | kept | `loading="lazy"` did not hold back slides in the horizontal scroller, and thumbnails loaded the full photo. |
| CDN cache for anonymous `GET /api/products*` and `/api/categories` (60 s + stale-while-revalidate) | 430–540 ms per call, never cached → 61–72 ms on HIT (1,261 ms on the first MISS). No throttling. | kept | Admin requests stay `private, no-store`; `Vary: Authorization` keeps them off the public copy. |
| Drop `FormsModule` from the navbar (plain form for search) | `main` 357 kB → 321 kB raw (115 kB → ~88 kB compressed). From `ng build`, deterministic. | kept | It was the only thing pulling `@angular/forms` into the initial bundle. |
| Page `stale-while-revalidate` 1 day → 7 days | not measured | kept, unverified | Targets the ~4.7 s cold render (two functions plus Neon waking from scale-to-zero), which only shows after a page goes unvisited for the whole window. Re-check `x-vercel-cache` on a rarely visited product after a week. |
| Move functions to `gru1` (São Paulo) | not tried | rejected | `/api/health` warm costs the same as a route with no query, so Neon sits next to `iad1`. Moving only the functions would add a cross-continent hop to every query. |

## Open

- Product page LCP is still 3.8–5.3 s on Slow 4G with the 1080px AVIF. Next
  step: a trace of the LCP render delay (the image is in the server HTML with
  `fetchpriority="high"`, so the remaining time is likely hydration or the
  ~88 kB `main` evaluating on a slow CPU).
- No field data: the site has no CrUX entry. Vercel Speed Insights would give
  p75 LCP/INP from real visitors.

## Guards

- `angular.json` budget: initial bundle warns above 340 kB and fails above
  380 kB (it is 324 kB). Re-adding a module the size of `@angular/forms` to
  the navbar trips the warning.
