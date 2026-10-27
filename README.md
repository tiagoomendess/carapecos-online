# Carapeços Online

The news site for Carapeços (Barcelos, Portugal), replacing the old BlogTok blog at carapecos.com. SvelteKit on Cloudflare Workers, with D1 for data and R2 for images. The full spec and the reasoning behind decisions is in [DRAFT.md](DRAFT.md).

- Public site: articles, categories, search, polls, comments, contact form, dark mode, PWA and web push
- Backoffice at `/admin`: articles, polls, pages, comments, messages, media, categories, users. Sticky top bar + left sidebar; see [docs/admin-chrome.md](docs/admin-chrome.md)
- SEO and LLM extras: sitemaps, RSS, JSON-LD, `llms.txt`, Markdown versions of articles (`/noticias/{slug}.md`)

## Local development

Needs Node 24+, and LocalStack (S3) running on `http://localhost:4566` with a `carapecos-media` bucket.

```bash
npm install
cp .env.example .env            # then fill in BETTER_AUTH_SECRET and VAPID keys (see below)
npm run db:migrate:local        # creates the local D1 in .wrangler/state
npm run import                  # imports the old site (cached in .import-cache/)
npm run dev
```

The first visit to `/admin` creates the first administrator.

Useful scripts:

| Script                      | What it does                                                          |
| --------------------------- | --------------------------------------------------------------------- |
| `npm run dev`               | Dev server (local D1, LocalStack)                                     |
| `npm run build` / `preview` | Production build, then run it in workerd on port 4173                 |
| `npm run check`             | Type checks (app and service worker)                                  |
| `npm run lint` / `format`   | Prettier and ESLint                                                   |
| `npm run test:unit`         | Unit tests                                                            |
| `npm run db:generate`       | New migration from schema changes (`src/lib/server/db/schema.ts`)     |
| `npm run db:migrate:local`  | Apply migrations to the local D1 (`:remote` for Cloudflare)           |
| `npm run import`            | Import the old site (options at the top of `scripts/import/index.ts`) |
| `npm run vapid`             | Generate a VAPID key pair for web push                                |

`npm run preview` uses `ORIGIN` from `.env` (`http://localhost:5173`), so the backoffice login only works there with that host; the public pages work regardless.

## Configuration

All settings are environment variables, documented in [src/env.ts](src/env.ts) and [.env.example](.env.example). In production, public values go in `vars` in `wrangler.jsonc` and secrets via `wrangler secret put`:

| Variable                                    | Production value                                                         | Secret |
| ------------------------------------------- | ------------------------------------------------------------------------ | ------ |
| `ORIGIN`                                    | `https://carapecos.com`                                                  |        |
| `BETTER_AUTH_SECRET`                        | 32+ random characters (also keys the IP hashes)                          | yes    |
| `S3_ENDPOINT`                               | `https://<account-id>.r2.cloudflarestorage.com`                          |        |
| `S3_REGION`                                 | `auto`                                                                   |        |
| `S3_BUCKET`                                 | the R2 bucket                                                            |        |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | an R2 API token with read/write on the bucket                            | yes    |
| `MEDIA_BASE_URL`                            | the bucket's public custom domain, e.g. `https://media.carapecos.com`    |        |
| `TURNSTILE_SITE_KEY`                        | from a Turnstile widget for carapecos.com                                |        |
| `TURNSTILE_SECRET_KEY`                      | from the same widget                                                     | yes    |
| `VAPID_PUBLIC_KEY`                          | from `npm run vapid` (generate once; changing it drops every subscriber) |        |
| `VAPID_PRIVATE_KEY`                         | from the same run                                                        | yes    |
| `VAPID_SUBJECT`                             | `mailto:` address the push services can contact                          |        |
| `CF_ANALYTICS_TOKEN`                        | Cloudflare Web Analytics site token (optional)                           |        |

## Launch checklist

Follows the launch plan in [DRAFT.md](DRAFT.md#launch-plan).

1. **Cloudflare resources**
   - Create the production D1 (`wrangler d1 create carapecos`) and put its name and id in `wrangler.jsonc` (it currently points at the `teste` database)
   - Create the R2 bucket, connect a public custom domain (e.g. `media.carapecos.com`) and create an R2 API token
   - Create a Turnstile widget for `carapecos.com`, and a Web Analytics site if wanted
   - Generate VAPID keys with `npm run vapid`
2. **Configure the Worker**: `vars` in `wrangler.jsonc` and `wrangler secret put` for each secret above
3. **Database**: `npm run db:migrate:remote`
4. **Deploy**: `npm run build && npx wrangler deploy`, then test on the `workers.dev` URL: create the admin, publish a test article, vote, comment, enable notifications on a phone
5. **DNS**: move carapecos.com's nameservers to Cloudflare, copying every existing record first (including MX for email)
6. **Freeze the old site**, then run the full import into production:
   ```bash
   npm run import -- --remote --env-file .env.production
   ```
   `.env.production` holds the R2 `S3_*` settings. `--remote` writes to the D1 in `wrangler.jsonc`
7. **Check the import**: article count (1,134+), images, categories, a sample of old URLs (`/blog/{id}/…`, `/blog/tag/…`) redirecting
8. **Domains**: add to `wrangler.jsonc` and deploy again; the app redirects `www.` to the bare domain itself
   ```jsonc
   "routes": [
   	{ "pattern": "carapecos.com", "custom_domain": true },
   	{ "pattern": "www.carapecos.com", "custom_domain": true }
   ]
   ```
9. **Search engines**: submit `https://carapecos.com/sitemap.xml` and `sitemap-news.xml` in Google Search Console and watch for crawl errors on old URLs
10. **Content**: review the seeded Política de privacidade and Regras dos comentários pages
