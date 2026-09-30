# IPTV Germany – Next.js 16

SEO-optimized sales website for an IPTV subscription targeting Germany (German content, `lang="de"`).
All pages are statically generated (SSG). Orders and trials go through WhatsApp.

## Run locally

```bash
npm install
cp .env.example .env.local   # then set your domain
npm run dev                  # http://localhost:3000
npm run build && npm start   # production test
```

Requires Node.js 20.9 or newer.

## What you edit

| File | Contents |
| --- | --- |
| `src/lib/site.ts` | Brand, domain, WhatsApp number, e-mail, company data for the Impressum |
| `src/lib/shop.ts` | Packages and prices, 24h trial, devices, payment methods, **crypto wallet addresses** |
| `src/lib/planPages.ts` | SEO copy for the plan pages `/preise/3-monate`, `/6-monate`, `/12-monate` |
| `src/lib/orders.ts` | Order statuses and all database queries for the admin dashboard |
| `src/lib/faqs.ts` | FAQ (feeds `/faq` + FAQPage schema) |
| `src/lib/guides.ts` | Device guides (each object = one page under `/anleitung/...`) |
| `src/lib/posts.ts` | Blog posts (each object = one page under `/blog/...`) |
| `src/app/impressum`, `datenschutz`, `agb` | Legal templates: have them reviewed before going live |

A new guide or post in the arrays automatically gets its page, sitemap entry, schema and footer link.

## Ordering flow

1. Every "bestellen" button opens the order popup (`src/components/order/OrderProvider.tsx`):
   name, e-mail, optional WhatsApp number, device, payment method.
2. **Card or PayPal** → WhatsApp opens (number from `site.whatsapp`) with a prefilled German message:
   package, price, device, payment method, contact data and an order number (`DE-XXXXXX`).
3. **Crypto** → `/checkout` (noindex). The customer accepts the terms, clicks "Zahlungspflichtig bestellen"
   (German button rule, § 312j BGB), then sees amount (live EUR rate from CoinGecko), wallet address and QR code.
   "Ich habe bezahlt" opens WhatsApp with the order, amount, network and optional TXID.
4. Wallets: fill `address` in `cryptoWallets` in `src/lib/shop.ts`. While an address is empty,
   that coin shows "nicht verfügbar" and the customer is sent to WhatsApp instead, so no order is lost.

Every order is also saved to the database (`/api/orders`) the moment the customer submits the popup,
so no order is lost even if the WhatsApp message is never sent. Prices are taken from `shop.ts` on the server,
never from the browser.

## Admin dashboard (`/admin`)

The admin UI is in **English** (the public site stays German; WhatsApp templates to customers stay German).

- **Period switch:** Today, 7 days, 30 days, 12 months, 2 years (Berlin time)
- **KPIs per period:** revenue with change vs. previous period, paid orders, orders received, average order value,
  closing rate; plus open payments (count and €) and active subscriptions
- **Chart:** revenue per hour/day/month (bars) and orders received (dots), hover for details
- **Breakdowns:** revenue by package, most ordered devices, payment methods
- **Order tabs:** Pending, On hold, Paid, All, each with counts
- **Row actions:** WhatsApp button opens the chat with that customer, one-click "Paid", status dropdown that saves on change
- **Renewals:** subscriptions expiring in 7 days with a WhatsApp renewal message
- **Orders page** (`/admin/orders`): all statuses with counts, search, device filter, paging; order detail with notes, expiry, templates, delete
- **CSV export** for Excel

Status flow: Pending → On hold (payment reported, check it; crypto orders with TXID land here
automatically) → Paid (counts as revenue) → Active (starts 3/6/12 months or 24 h) → Expired (automatic).
The WhatsApp number is required in the order popup so every order can be answered from the dashboard.

### Setup on Vercel (once)

1. **Database:** Vercel → Storage → Marketplace → **Neon** → create (region **Frankfurt / eu-central-1**) → connect to this project.
   This sets `DATABASE_URL`. The `orders` table is created automatically on first use.
2. **Password:** Settings → Environment Variables → `ADMIN_PASSWORD` (long, random), Production.
3. **Redeploy** once. Then open `/admin`.

Changing `ADMIN_PASSWORD` logs out all sessions. Locally: run any Postgres and put `DATABASE_URL` + `ADMIN_PASSWORD` in `.env.local`.

## Google Analytics (`/admin/analytics`, like MonsterInsights)

**Tracking** (public site): set `NEXT_PUBLIC_GA_ID` (G-…). GA4 is loaded **only after opt-in** in the cookie banner
(DSGVO / § 25 TDDDG). "Cookie-Einstellungen" in the footer lets visitors withdraw; GA cookies are deleted then.
Without `NEXT_PUBLIC_GA_ID` there is no banner, no cookies, no tracking. Events sent: `begin_checkout`
(order popup opened) and `generate_lead` (order sent) with value in EUR.

**Reporting** (admin): realtime users, sessions, users, new users, pageviews, session duration, engagement and
bounce rate (with change vs previous period), chart per hour/day/month, order funnel, traffic channels, devices,
new vs returning, top pages, countries, sources, landing pages. Periods: today, 7/30/90 days, 12 months.

Setup: Google Cloud project → enable *Google Analytics Data API* → service account → JSON key.
GA4 Admin → Property access management → add the service account as **Viewer**. Then in Vercel:
`GA_PROPERTY_ID` (numeric), `GA_CLIENT_EMAIL`, `GA_PRIVATE_KEY` (the `private_key` from the JSON) and redeploy.

## Deploy: GitHub → Vercel

1. **Create a GitHub repo** (private is fine), then in the project folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USER/iptv-germany.git
   git push -u origin main
   ```
2. **Vercel → Add New → Project → Import** the repo. The framework is detected as Next.js; keep the default build settings.
3. **Environment variable** (Settings → Environment Variables), scope **Production** only:
   `NEXT_PUBLIC_SITE_URL = https://www.your-domain.de` (no trailing slash).
   Optional: `NEXT_PUBLIC_GSC_VERIFICATION`.
4. **Add the domain** (Settings → Domains): add both `your-domain.de` and `www.your-domain.de`,
   and set one to **redirect (308)** to the other. It must be the same version you put in `NEXT_PUBLIC_SITE_URL`.
5. **Redeploy** once after setting the variable (Deployments → … → Redeploy), because the domain is baked in at build time.

From then on, every `git push` to `main` deploys to production. Other branches/PRs create preview deployments.

### Indexing protection for previews

Only the production deployment is indexable. On preview deployments (`VERCEL_ENV=preview`) the site automatically serves:
- `robots.txt` with `Disallow: /`
- `<meta name="robots" content="noindex">` on every page

This prevents Google from indexing duplicates on `*.vercel.app`. Locally (no `VERCEL_ENV`) the site behaves like production.

## After go-live

1. Google Search Console: add the domain property and submit `https://www.your-domain.de/sitemap.xml`.
2. Rich Results Test on `/`, `/preise`, `/faq`, `/anleitung/fire-tv-stick`, `/blog/was-ist-iptv`.
3. Open `https://your-project.vercel.app` and check that it is not indexed. The canonical tags already point to your domain.

## SEO features

- Metadata API per page: title, description, canonical, Open Graph, Twitter
- JSON-LD: Organization, WebSite, Product/AggregateOffer, FAQPage, HowTo, BlogPosting, BreadcrumbList
- `sitemap.xml`, `robots.txt`, `manifest.webmanifest`, generated OG image (1200×630) and icons
- German URL slugs, one H1 per page, internal linking between guides, blog and pricing
- Self-hosted variable font (no Google Fonts request → GDPR/DSGVO), font preload, CLS 0
- No cookies, no tracking → no consent banner needed (until you add analytics)
- Security headers (HSTS, nosniff, frame options, referrer and permissions policy)
- Lighthouse mobile: Performance 96, Accessibility 100, Best Practices 100, SEO 100

## Structure

```
src/
  app/(site)/     Public pages (own layout with header, footer, order popup)
  app/admin/      Admin dashboard (login, overview, orders, CSV export)
  app/api/        Order API (save order, report crypto payment)
  app/            Root layout, sitemap.ts, robots.ts, manifest.ts, OG image
  components/     Header, Footer, EPG hero, pricing rows, FAQ, breadcrumbs, JSON-LD
  lib/            site.ts (config), seo.ts (metadata + schema), content (faqs, guides, posts)
  (font)          Archivo variable via @fontsource-variable/archivo, self-hosted at build (OFL)
```
