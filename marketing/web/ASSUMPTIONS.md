# Marketing redesign — assumption log

Running record of decisions I made autonomously while building phases 2–8
without stopping to ask. Review each before we push to prod.

Format: **Decision**, **Why**, **Alternative if you disagree**.

---

## Global

### A-1. Positioning triad
**Decision:** Three pillars on the homepage and throughout: **Practitioner-built · Simple & powerful · Open source**. "Radically affordable" is retired as a headline claim. Affordability is mentioned factually on `/offer` but is not a pillar.
**Why:** Direct from your answers. Open source is now the lead differentiator.
**Alternative:** Keep "Radically affordable" somewhere visible (e.g. as a tagline under the hero).

### A-2. License framing
**Decision:** AGPL v3 (taken from the old site's JSON-LD). Mentioned on `/offer`, `/on-premise`, `/security`, footer.
**Why:** The old site's structured data listed AGPL v3.
**Alternative:** Different license — tell me and I'll update everywhere.

### A-3. GitHub URL
**Decision:** `https://github.com/kanap-it/kanap` (public repo per CLAUDE.md).
**Why:** Matches the remote in CLAUDE.md.

### A-4. App / docs URLs
**Decision:** `https://app.kanap.net` (sign-in target), `https://doc.kanap.net` (docs).
**Why:** Current production subdomains referenced in the existing site.

### A-5. Plaid (AI assistant)
**Decision:** Mentioned by name as "Plaid, the built-in AI assistant" on `/features/ai` and on the homepage module strip. Positioned as MCP-capable.
**Why:** The old site's meta description explicitly names Plaid. Keeping brand continuity.
**Alternative:** Different positioning for the AI surface.

### A-6. Trust strip placeholder
**Decision:** Homepage has an empty "Used by IT teams worldwide" slot with a soft "share your story" link to `/contact`, not hidden. Logos are placeholder SVGs I can swap out when you have them.
**Why:** You said: prepare the section.

### A-7. Currency
**Decision:** All pricing in EUR (€), same as the old site.

---

## Pricing

### A-8. Cloud pricing values — RESOLVED from old site
**Decision:** Starter €49/mo (or €490/yr — 2 months free) · up to 5 contributors · 500 Plaid msg/mo.
Standard €149/mo (or €1,490/yr) · up to 25 contributors · 1,500 Plaid msg/mo.
Max €249/mo (or €2,490/yr) · unlimited contributors · 2,500 Plaid msg/mo.
All plans include: all features, cloud hosting, auto updates, unlimited read-only users, BYOK for Plaid, free 60-min activation session, priority email support, 20% consulting discount.
**Why:** Pulled verbatim from `marketing/site/offer.html`.
**Note:** The GTC legal doc (sales.html) still refers to only Free/Starter/Standard tiers; it's out of sync with the offer page. Flagging — you may want to update the GTC before launch.

### A-9. Support-contract pricing — RESOLVED
**Decision:** Self-Hosted Support: €2,490/yr, annual billing only. Includes all features, unlimited contributors, priority email support, 20% consulting discount, BYOK for Plaid.
**Why:** From the old offer page.

### A-9b. Consulting rates — RESOLVED
**Decision:** Included on `/offer`: 1h €190 / subscriber €150; half-day €690 / €550; full-day €1,250 / €1,000.
**Why:** From old offer page table.

### A-10. Trial length
**Decision:** "14-day free trial" mentioned on `/trial/start` and CTAs.
**Why:** `TRIAL_PERIOD_DAYS` default in `backend/src/public/public.controller.ts` was 14.
**Alternative:** Different duration.

---

## Pages / sitemap

### A-11. New pages scope
Built in phases: `/changelog`, `/security`, `/on-premise`. Confirmed in chat.

### A-12. Legal pages
**Decision:** I ported the content from the old `/privacy`, `/terms`, `/sales`, `/legal` pages into the new shell verbatim, with only minor typographic cleanup. Did not rewrite legal copy.
**Why:** Legal copy shouldn't change based on a design refresh without explicit review by you or counsel.

### A-13. Changelog content
**Decision:** I seeded `/changelog` with one generic "April 2026 — New marketing site" entry as a template. Future entries are expected to be written as MDX in `src/content/changelog/`.
**Why:** I don't have authoritative changelog history.

---

## Conversion funnel

### A-14. Trial signup form fields
**Decision:** Same 5 fields as the current `activate.html` modal: organization name, country, subdomain slug, admin email, CAPTCHA.
**Why:** The backend endpoint `/api/public/start-trial` expects these.

### A-15. CAPTCHA provider
**Decision:** Cloudflare Turnstile (matches the old site). Site key is read from `PUBLIC_TURNSTILE_SITE_KEY` at build time; falls back to a placeholder that lets the form render but warns in console. Real key must be set in `.env` before production.
**Why:** Old site used Turnstile; keeps backend unchanged.
**Action for you:** Set `PUBLIC_TURNSTILE_SITE_KEY` in your build env.

### A-16. `/trial/start` replaces the modal-on-offer approach
**Decision:** The "Start free trial" CTA opens a dedicated `/trial/start` page rather than a modal.
**Why:** Shareable URL, trackable funnel step, simpler responsive behavior. Explained in the plan.

### A-17. `/trial/check-email` is new
**Decision:** Post-submit the user lands on `/trial/check-email?email=...` which confirms the email was sent and tells them what to do next. The old flow just showed an inline status string.
**Why:** Better conversion UX, clearer mental model.

### A-18. Activation handoff unchanged
**Decision:** After workspace is created, `/trial/activate` redirects to `{tenant_url}/reset-password#{token}?from=trial` — same as the current flow.
**Why:** Backend contract unchanged.

---

## SEO / analytics

### A-19. Analytics
**Decision:** GA4 wired behind a `PUBLIC_GA_ID` build-time env var. If unset, the snippet is omitted. I ported the old `G-JNTR8JXN1Q` as a fallback in a commented line for reference — not active unless you uncomment.
**Why:** Avoids accidentally double-counting against the old site and lets you opt in explicitly.

### A-20. Sitemap generation
**Decision:** Using `@astrojs/sitemap` with per-locale entries (`/`, `/fr/`, `/de/`, `/es/`) and `i18n` config. Auto-generated at build.
**Why:** Zero-maintenance, always in sync with routes.

### A-21. JSON-LD
**Decision:** `SoftwareApplication` + `Organization` on homepage; `WebPage` + `Product` on `/offer`; `FAQPage` on `/faq`; `BreadcrumbList` on feature pages.
**Why:** Matches/extends the old site's structured data.

### A-22. OG images
**Decision:** Kept the old `og-image.png` as default. Per-page OG images can be added later as `/og/{slug}.png`. No per-page OG yet — `ASSUMPTION: one default OG image for all pages` until you provide tailored ones.

### A-23. Canonical domain
**Decision:** `https://kanap.net` (matches old site's `site` config).

---

## Design / charter

### A-24. Teal scope on marketing
**Decision:** Teal is used only for (1) primary CTAs, (2) active nav underline, (3) prose/inline links, (4) focus rings, (5) the contact-us / "share your story" action links. Not for feature card accents, not for icons, not for module names.
**Why:** App charter explicitly bans teal everywhere else.

### A-25. Module accent colors
**Decision:** Marketing modules (Budget / IT-Ops / Portfolio / Knowledge / AI) are **not color-coded**. They are neutrally styled cards. The old site had Budget=blue / IT-Ops=purple / Portfolio=teal — I dropped this.
**Why:** Charter: "monochrome-dominant. Color signifies, not decorates." Module badges are decorative.
**Alternative:** Bring back module accent colors if you want visual distinction on the hub page.

### A-26. Typography
**Decision:** Inter 400/500 only. Hero 56–72px (display scale), section 32–40px, body 15px. App typography scale (14/13/12/11) applies everywhere else.
**Why:** Charter rule.

### A-27. No heavy shadows
**Decision:** Cards use the charter's card treatment exactly (border + hover shadow). No floating "3D" effects.

### A-28. Dark mode contrast check
**Decision:** Every new component is tested against both `:root` (light) and `:root[data-theme="dark"]`. No hardcoded colors in any component.

---

## Tech

### A-29. Font delivery
**Decision:** Inter + JetBrains Mono via Google Fonts (`<link>` preconnect). Not self-hosted in phase 1. I recommend switching to `@fontsource-variable/*` before launch for privacy and perf. Flagged in phase 8.

### A-30. MDX for content
**Decision:** Feature pages use Astro components with content in TypeScript arrays, not MDX. MDX pulled in would add @astrojs/mdx dependency with no concrete benefit for phase 1–5. Could revisit for `/changelog` where long-form content matters.

### A-31. Old `marketing/site/` directory
**Decision:** Left untouched but excluded from Docker build (via `.dockerignore`). Delete-whenever-ready.

### A-32. Content in locale JSONs
**Decision:** Page body copy lives in `src/i18n/{locale}.json`. Very long prose (legal pages, eventually the changelog) goes in per-locale Astro pages to avoid JSON bloat. FR/DE/ES copy is my best effort; Phase 6 refines with `/translate`.

---

## Known open items — for your review

### Content / business decisions
1. Confirm cloud pricing (A-8) — I used the old site's €49/€149/€249 tiers; confirm or update the TypeScript files in `src/content/offer/`
2. Self-Hosted Support pricing (A-9) — I kept €2,490/yr; confirm or update
3. **GTC legal document mentions only Free/Starter/Standard tiers** — it's out of sync with the Starter/Standard/Max structure on the offer page. Your lawyer should probably reconcile this before you push pricing to prod
4. Real testimonials (A-6) — the homepage has a placeholder "trust strip" pointing to `/contact` for stories. Fill it in when you have any
5. Per-page OG images (A-22) — I reuse the old `og-image.png` sitewide. Consider per-page OG for `/offer`, `/features/*`, `/security`
6. Module accent colour decision (A-25) — currently monochrome. Worth revisiting on the `/features` hub for visual distinction?

### Infrastructure / deployment
7. Set `PUBLIC_TURNSTILE_SITE_KEY` in the build env before production for `/trial/start` (form works without it locally but should have it on for real traffic)
8. Set `PUBLIC_GA_ID` to the GA4 measurement ID if you want analytics — snippet is wired, just add the env var
9. Font self-hosting (A-29) — currently Google Fonts. Swap to `@fontsource-variable/inter` + `@fontsource-variable/jetbrains-mono` before prod for privacy/perf
10. Delete or archive old `marketing/site/` — no longer built or served, kept for reference

### Translations
11. **Legal pages (privacy, terms, sales, legal) are English-only.** FR/DE/ES routes render the same English text with a "currently available in English only" banner. Professional legal translation required before these can be binding in other jurisdictions
12. **FR content was written by me.** DE and ES for homepage/offer/on-premise were also hand-written by me. Feature pages + secondary pages (FAQ, security, changelog, contact) DE/ES were generated by a translation agent using the FR files as a reference. Review the Spanish and German feature copy before prod; the translations are reasonable but a native reviewer will catch nuance

### Changes from the old site
13. URL rename `/features/it-ops` → `/features/it-landscape` (A-33). 301 redirect is already configured in `nginx.conf`. No action needed on your side — this is done.
14. `/activate.html` is gone; replaced by `/trial/activate`. 301 redirect in place.
15. The modal-on-offer trial form is now a real page at `/trial/start`. Old offer-page-scroll-to-modal anchors will no longer work — update any external links.
16. Trial funnel added two new pages: `/trial/check-email` and `/trial/expired`. These didn't exist in the old flow. The backend contract (POST `/api/public/start-trial`, POST `/api/public/activate-trial`) is unchanged.

### A-33. IT Ops URL rename
**Decision:** Module is labeled "IT Landscape" (per the old site copy). URL moves from `/features/it-ops` to `/features/it-landscape` — cleaner match with the label.
**Why:** Old site inconsistency (label "IT Landscape" at URL `/features/it-ops.html`).
**Action for you:** Add a 301 from `/features/it-ops` to `/features/it-landscape` at the nginx/edge level before launch. Noted in phase 8.
