---
target: clamy-decohogar site (home, productos, carrito, admin)
total_score: 20
max_score: 36
na_heuristics: 10
p0_count: 2
p1_count: 3
target_identity: "file:C:\\repositorio\\clamy\\clamy\\clamy-decohogar site (home, productos, carrito, admin)"
timestamp: 2026-09-03T16-20-50Z
slug: clamy-decohogar-site-home-productos-carrito-admin
---
Method: dual-agent (A: design review sub-agent · B: detector + technical audit sub-agent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2/4 | No loading state during the SSR/hydration gap; add-to-cart feedback inconsistent between surfaces |
| 2 | Match System / Real World | 3/4 | Strong es-AR/WhatsApp fit; "Mayorista y minorista" claim isn't reflected anywhere in actual pricing/cart logic |
| 3 | User Control and Freedom | 2/4 | Cart qty stepper deletes the line item at 0 with no confirm/undo |
| 4 | Consistency and Standards | 2/4 | Missing-image state rendered 4 different ways across card/detail/cart/admin |
| 5 | Error Prevention | 2/4 | Every product-fetch failure sitewide collapses into the same "empty catalog" copy as real zero inventory |
| 6 | Recognition Rather Than Recall | 3/4 | Categories repeat identically across nav/home/catalog — good |
| 7 | Flexibility and Efficiency | 1/4 | No bulk-add despite the site explicitly courting wholesale buyers |
| 8 | Aesthetic and Minimalist Design | 3/4 | Coherent token system; docked for hero-photo pairing mismatch and a monochrome rule with no photography to apply to |
| 9 | Error Recovery | 2/4 | Where errors surface, copy is good; most failure paths surface nothing at all |
| 10 | Help and Documentation | n/a | Support model is live WhatsApp, correctly surfaced contextually — not a gap for this surface |

**Total: 20/36 (heuristic 10 n/a) → 55.6% → Acceptable.**

## Technical Audit Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2/4 | `--text-faint` (#6b6b72 on #050506) ≈ 3.86:1, fails WCAG AA, used for labels/status/eyebrows sitewide |
| 2 | Performance | 2/4 | Zero `loading="lazy"` anywhere; hero LCP image is a JS-bound `background-image`, invisible to the browser's preload scanner |
| 3 | Theming | 3/4 | Token system used consistently; one stray hard-coded `#ff8080`, no `--danger` token |
| 4 | Responsive Design | 3/4 | Good breakpoint coverage; hero dots (8×8px) and cart remove-button fail the 24×24 touch-target minimum |
| 5 | Implementation Integrity | 1/4 | SSR fully built but inert (`RenderMode.Client` on every route) — confirmed via curl: 4 routes return byte-identical empty `<app-root>` |

**Total: 11/20 → Acceptable (significant work needed).**

Both reviewers ran independently with no visibility into each other's output. Assessment B's deterministic detector flagged 5 `broken-image` findings that were verified false positives (all wrapped in proper Angular `@if`/`@else` guards — the detector's regex fallback can't see structural control flow); the real issue behind them, converged on independently by both assessments, is that every `imageUrl` is null, not that the markup is broken. The detector also caught one real, low-priority issue neither assessment's manual read had flagged: an unguarded `bounce-easing` animation on the hero scroll cue, and one dead CSS class (`.grid-texture`, defined but never applied in any template).

## Design Specificity Verdict

**Category-interchangeable shell with genuinely specific content wiring.** The visual system — near-black background, one monochrome palette, Montserrat/Inter pairing, 2px-radius cards — is the exact grammar of a hundred dark-editorial templates; nothing in the structure alone says "lighting and home-decor retailer in Rosario." The specificity lives entirely in the content layer: two real WhatsApp numbers threaded through hero/detail/cart/footer, a real street address and store hours, es-AR currency formatting, and a checkout flow that hands off to WhatsApp with an itemized pre-filled message — that's authored around how this actual business transacts, not boilerplate.

The one place the visual system *could* become unmistakably "this store" is photography, and it's currently empty across all 13 live products. There's also a real tension worth resolving deliberately rather than by default: the site forces all product photography to grayscale as a stated design decision, but the product being sold is *light* — a lit chandelier's warm glow is arguably the exact quality a lighting retailer's photography needs to sell, and grayscale strips it. The two hero photos already in place (a formal English dining room with a crystal chandelier vs. a dark Scandinavian-industrial loft with a wave-shaped LED fixture) are also from two different stylistic vocabularies that grayscale flattens but doesn't reconcile.

## Overall Impression

The bones are good — genuinely disciplined token system, low cognitive load, a checkout mechanism authored around how this specific business actually sells (WhatsApp, not a generic cart). But the site is currently not ready to receive real traffic, for two converging reasons that are both fixable in hours, not weeks: it has zero product photography (the entire point of a visual catalog), and it ships an SSR build that produces literally empty HTML on every route despite the infrastructure being fully built — meaning search engines and link-preview crawlers currently see nothing. Neither is a design problem in the "bad taste" sense; both are unfinished-integration gaps in an otherwise coherent build.

## What's Working

1. **Token discipline.** One `--radius`, one `--glow`, one `.btn`/`.card`/`.qty-stepper` set, reused verbatim across navbar, cards, cart, and the entire admin panel. Unusually restrained for a small-business build, and it's why the site feels like one product even where content is thin.
2. **WhatsApp checkout is authored, not generic.** Two real, distinct phone numbers surfaced consistently at every touchpoint, and the pre-filled message actually itemizes qty/name/subtotal in Spanish rather than a generic "I'm interested" string.
3. **Low cognitive load by construction.** Single-focus pages, consistent grouping, cart state persisted through interruption via `localStorage` with zero UI ceremony. The architecture isn't overloading anyone — the issues below are feedback/consistency gaps, not structural complexity.

## Priority Issues

**[P0] SSR is fully built but produces zero rendered content on every route.**
- **Why it matters**: `app.routes.server.ts` sets the catch-all route to `RenderMode.Client`. Confirmed live via curl against the production build: `/`, `/productos`, `/carrito`, and `/admin/login` all return byte-identical responses with an empty `<app-root></app-root>`. The project pays the full runtime/build cost of SSR (Express server, `main.server.mjs`, hydration) and gets none of the benefit — zero SEO-crawlable content, zero pre-hydration paint. For a catalog business whose customer acquisition depends on search and shared links, this is close to functionally not having SSR at all.
- **Fix**: change `RenderMode.Client` to `RenderMode.Server` (or `Prerender`) for `/`, `/productos`, `/productos/:id` at minimum. Admin routes can stay client-only.
- **Suggested command**: `/impeccable harden`

**[P0] Every product renders as a placeholder, and the placeholder itself is inconsistent across four surfaces.**
- **Why it matters**: All 13 live products have `imageUrl: null`. For a visually-decided purchase category, the photo effectively *is* the product description — right now every card, the product-detail page, and the admin table show a blank "CLAMY" text tile instead, and the cart shows a completely unlabeled blank div (a fourth, different treatment). A first-time visitor has no way to distinguish "deliberate style" from "this site is broken."
- **Fix**: load real photography through the already-working admin uploader before sending traffic here. Separately, standardize the missing-image state to one intentional treatment (e.g., a decor glyph + "Foto próximamente") applied identically everywhere, so the interim state reads as deliberate rather than broken.
- **Suggested command**: `/impeccable polish` (placeholder consistency), then get photos in, then `/impeccable polish` again.

**[P1] `--text-faint` fails WCAG AA contrast and is used for exactly the text meant to inform the user.**
- **Why it matters**: `#6b6b72` on `#050506` computes to ≈3.86:1, below the 4.5:1 AA minimum. This token drives every category eyebrow, every form label sitewide (including login and admin), all loading/empty-state copy, and table headers — the lowest-contrast text on the page is the system-status text, the opposite of where that should sit.
- **Fix**: raise `--text-faint` toward `#8a8a90` or brighter for anything carrying real information; keep the darkest tone only for genuinely decorative use.
- **Suggested command**: `/impeccable harden`

**[P1] Cart quantity stepper silently deletes the line item at zero, no undo.**
- **Why it matters**: `CartService.updateQty()` removes the item outright the instant the "-" stepper hits 0 — one extra tap and it's gone, no confirmation, no undo toast. This is the highest-stakes page in the storefront, right before checkout.
- **Fix**: block the stepper at qty=1 and require the explicit "✕ remove" for deletion, or add a brief undo toast.
- **Suggested command**: `/impeccable harden`

**[P1] The WhatsApp checkout handoff gets zero on-site confirmation.**
- **Why it matters**: "Finalizar por WhatsApp" just opens a new tab — no confirmation screen, no expectation-setting ("usually respond within X hours"), no order reference left on-site. For a store with no payment gateway, this WhatsApp handoff *is* the checkout, and it currently gets less ceremony than a single add-to-cart click does.
- **Fix**: add a lightweight on-site confirmation before/after opening WhatsApp.
- **Suggested command**: `/impeccable delight` or `/impeccable clarify`

**[P2] Add-to-cart feedback is inconsistent between the two highest-traffic entry points.**
- **Why it matters**: Product-detail shows an explicit "Agregado ✓" confirmation; the product-card add button (used on home and the full catalog — far more common) gives no local feedback beyond a distant navbar badge tick.
- **Fix**: extend the product-detail confirmation pattern to the card button everywhere it appears.
- **Suggested command**: `/impeccable polish`

**[P2] Category dropdown has no ARIA disclosure semantics.**
- **Why it matters**: The "Categorías" trigger has no `aria-expanded`/`aria-haspopup`, unlike the sibling search-toggle button in the same file which does wire this up. Screen-reader users get no indication it's a menu trigger or whether it's open.
- **Fix**: add `aria-haspopup="true"` and bind `aria-expanded` to open state.
- **Suggested command**: `/impeccable harden`

**[P2] Hero auto-advance isn't paused for `prefers-reduced-motion`; touch targets are undersized.**
- **Why it matters**: The Ken Burns zoom itself is correctly guarded by `prefers-reduced-motion` — but the underlying 6-second slide-advance timer isn't, and there's no visible pause control beyond 8×8px dots (well under the 24×24px minimum). The cart's remove button is similarly undersized. Both were flagged independently by the design-persona walkthrough and the technical audit.
- **Fix**: gate the slide timer under the same media query or add a visible pause control; pad both touch targets to ≥24×24px.
- **Suggested command**: `/impeccable harden`

**[P2] Error and status text isn't announced to assistive tech.**
- **Why it matters**: Login/save failures render as a plain `<p>` with no `role="alert"`; the "Agregado ✓" confirmation swap has no `aria-live` region. Screen-reader users get no signal that anything happened, success or failure.
- **Fix**: add `role="alert"` to error blocks; add `aria-live="polite"` to the add-to-cart confirmation.
- **Suggested command**: `/impeccable harden`

**[P2] No lazy-loading anywhere, and the hero image can't be discovered by the browser's preload scanner.**
- **Why it matters**: Currently moot for the catalog (nothing to lazy-load yet), but will bite the moment photography lands. Separately, the hero's `[style.background-image]` binding means the largest visual element on the homepage can't start downloading until the full JS bundle executes — compounding the SSR gap into a real LCP regression.
- **Fix**: add `loading="lazy"` to all product `<img>` bindings; once SSR is fixed, render the hero as a real `<img>` so it's discoverable in the initial HTML.
- **Suggested command**: `/impeccable optimize`

## Persona Red Flags

**Casey (Distracted Mobile User)**: Hero dots and hamburger menu both fail the 44×44pt touch-target guideline. Hero images load at fixed desktop resolution with no responsive `srcset` — her phone downloads the same bytes a desktop monitor would. Positive: cart survives interruption via `localStorage`, directly addressing her main failure mode.

**Riley (Deliberate Stress Tester)**: Finds the cart-deletion gap immediately. Kills the network and gets an identical UI to a genuinely empty catalog — no way to distinguish "API is down" from "nothing here," confirmed across home, catalog, detail, and admin. Refresh-mid-flow is actually handled correctly (cart persists) — a real pass, not a flag.

**Jordan (Confused First-Timer)**: The blank "CLAMY" tile has no caption or icon — most likely reading is "this site is broken." Two separate, unlinked search entry points exist (topbar toggle + a second input on `/productos`) with nothing indicating whether they're the same search. WhatsApp checkout gives no preview of what happens next before clicking — real hesitation risk for anyone unfamiliar with WhatsApp-as-checkout.

## Minor Observations

- Duplicate price-formatting logic: `ArsCurrencyPipe` plus a second private `formatPrice()` in `cart.ts` for the WhatsApp message text — two implementations of the same `Intl.NumberFormat` call to keep in sync by hand.
- Footer links to `www.clamy.com.ar`, a separate domain from wherever this app is actually hosted — confirm that's intentional.
- One hard-coded color (`#ff8080`) bypasses the token system; no `--danger` token exists despite it being the only destructive-action affordance.
- Dead CSS: `.grid-texture` is defined but never applied in any template.
- A `<button>` is nested inside an `<a>` in the product card (invalid HTML5); functionally mitigated with `preventDefault`/`stopPropagation`, but worth restructuring.

## Questions to Consider

- "Mayorista y minorista" leads the homepage, but nothing downstream — pricing, cart, checkout — ever distinguishes a wholesale buyer from a retail one. Is wholesale handled entirely offline, or does this design need to surface a real wholesale mechanic?
- The grayscale-everything rule was chosen with no real photography yet to test it against, for a product category (light) defined by warm color and glow. Worth deciding deliberately before real photos go in — reversing it later means reshooting that decision from scratch.
- If a first-time visitor's honest impression of "the catalog" today is 13 identical text tiles, is this site ready for traffic right now, or is photography the actual launch gate everything else is waiting behind?
