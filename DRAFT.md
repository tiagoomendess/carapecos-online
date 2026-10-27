# Carapeços Online: simple modern news blog

This replaces https://carapecos.com/, a very outdated blog running on the BlogTok platform. The goal is not to copy the old site. We will import all of its articles, and after that we'll add extra pages by hand as needed.

## Brand context

A local news site for Carapeços, a parish in the Barcelos municipality, Portugal. Running since 2004 ("A informar desde 2004").

- Main colors: black and green
- Logo: `static/carapecos_online_logo.png`
- Language: Portuguese (pt-PT) only. Paraglide stays in the project only so UI strings aren't hardcoded.

## Main features

- **Articles**: one category each, cover image, reader comments
- **Polls**: anonymous voting with best-effort fraud protection, shown in the feed and embeddable in articles
- **Pages**: simple CMS pages (e.g. Sobre, Contactos) built with the same editor as articles
- **Search** across articles and polls
- **Most read + related articles**
- **Sharing** and **web push notifications** for new articles

## Content model

### Articles

- Title, slug, lead/summary (used in listings, SEO description and push notifications), rich-text body, 16:9 cover image, category, publish date
- Status: draft, scheduled (publishes automatically at a set date/time) or published
- Can be pinned as **featured**
- Body supports headings, images, links, quotes, YouTube/Facebook video embeds and embedded polls
- No author byline is shown publicly; the backoffice still records who created/edited each article
- Keeps a `legacyId` (old BlogTok id) for redirects

### Categories

One category per article. Categories are managed in the backoffice. Starting list:

| Category              | Old tags mapped to it                                          |
| --------------------- | -------------------------------------------------------------- |
| Desporto              | Futebol, Campeões de Futebol                                   |
| Política              | Política                                                       |
| Sociedade             | Moda, plus any untagged article (default)                      |
| Cultura e Tradições   | Marchas Populares, Ranchos Folclóricos, Teatro, Natal, S.Tiago |
| Religião              | Igreja                                                         |
| Ocorrências           | Acidentes, Incendios, Intemperes                               |
| Solidariedade         | A.C.Solidário                                                  |
| Entrevistas e Opinião | Entrevistas                                                    |

If an old article has several tags, the first matching row in this table wins.

### Polls

- Question, slug, 2 or more options, publish date, optional closing date
- Single or multiple choice, set per poll
- Results stay hidden until the visitor votes or the poll closes
- No login needed to vote. Best-effort fraud protection: Turnstile on vote, one vote per poll per device (cookie + localStorage), rate limit on a salted hash of IP + user agent (raw IPs are never stored)
- Shown in the homepage feed by publish date, and embeddable inside an article body

### Comments

- Anyone can comment with a name and a message, protected by Turnstile. No account needed
- Published right away. Editors can hide or delete them afterwards
- One level of replies (a reply to a reply goes to the same thread)
- Basic abuse protection: rate limit per IP hash, max links per comment, blocked-words list, and a "Reportar" button that flags a comment for editors

### Pages

- Title, slug, rich-text body, and a "show in footer" flag
- At launch:
  - **Contactos**: a contact form (name, email, message) protected by Turnstile. Messages are saved in D1 and read in the backoffice. No email is sent
  - **Política de privacidade**: what personal data is collected (comments, push subscriptions, contact messages, hashed IPs) and why. Linked in the footer and next to the comment form, the contact form and the push opt-in
  - **Regras dos comentários**: short comment rules, linked next to the comment form

## Public site

### URLs

| Content    | URL                                                            |
| ---------- | -------------------------------------------------------------- |
| Homepage   | `/` (more pages at `/?pagina=2`)                               |
| Article    | `/noticias/{slug}` (Markdown version at `/noticias/{slug}.md`) |
| Poll       | `/sondagens/{slug}`                                            |
| Category   | `/categoria/{slug}`                                            |
| Search     | `/pesquisa?q=…`                                                |
| CMS page   | `/{slug}`                                                      |
| Backoffice | `/admin`                                                       |

If an article's slug changes, the old slug 301-redirects to the new one.

### Layout and navigation

- Top bar: back button on the left when not on the homepage, logo in the center, search and dark/light toggle on the right (search sits to the left of the toggle)
- Under the top bar, horizontally scrolling **category chips** ("Todas", Desporto, Política…). Each category has its own URL, e.g. `/categoria/desporto`
- Footer: links to CMS pages, contact, RSS, copyright

### Homepage

- One **featured article** at the top, full width, with the title under the picture. It's the pinned article, or the newest one if nothing is pinned
- Then a feed of articles and polls mixed together, newest first. Articles show a smaller picture with the title to its right. Polls show inline and can be voted on from the feed
- Paginated or infinite scroll, with real paginated URLs (`?pagina=2`) for SEO
- A "Mais lidas" (most read in the last 30 days) block

### Article page

- Cover image (16:9), category, date, title, lead, body
- Share: native share sheet on mobile (Web Share API), with WhatsApp, Facebook and copy-link as a fallback
- Related articles (same category, recent), then comments

### Search

- Searches article titles, leads, bodies and poll questions
- Accent-insensitive ("carapecos" finds "Carapeços")

### Images

- All covers are 16:9. The backoffice crops to 16:9 on upload
- Sizes are generated once, at upload time, and stored in R2 next to the original. Nothing is resized when a page is requested
  - The backoffice resizes in the browser before uploading
  - The import script resizes with sharp
  - Suggested widths: 480, 960 and 1600 px as WebP, with the original kept as a fallback
- Imported articles use their first image as the cover, center-cropped. Articles without images get a branded placeholder
- Pages use `srcset`/`sizes` to pick the right width and lazy-load images below the fold

### Implementation notes (step 3)

- Design tokens live in `src/routes/(site)/site.css`: colors switch with `light-dark()`, and `data-theme` on `<html>` (set by an inline script in `app.html` before paint) overrides the system theme. The type scale is `.text-display`, `.text-title`, `.text-headline`, `.text-caption` and `.text-eyebrow`. Glass surfaces use `.glass`, which turns solid under reduced transparency or higher contrast. Press feedback uses `.pressable`
- Header controls float as glass pills (back, logo + name, search + theme), with content scrolling under them
- Category chips appear on the homepage and category pages, not on articles or CMS pages, so reading stays uncluttered
- Page changes cross-fade with the View Transitions API, and covers morph from the listing into the article. Both are off under reduced motion
- Search uses an FTS5 table, `search_index` (migration 0003), filled by the app with plain text stripped from the HTML. The import rebuilds it on every run; the backoffice must update it on save (`indexStatements` in `src/lib/server/search.ts`). `wrangler d1 export` doesn't support virtual tables, so drop and recreate `search_index` around exports
- Views are counted by a `sendBeacon` to `/api/vistas`, once per article per browser session. That skips prefetches and most bots
- Not built yet: polls in the feed and comments (step 5), and the `.md` article versions, SEO metadata beyond title, description and canonical, and the RSS link in the footer (step 6)

## Backoffice (`/admin`)

- Built with **flowbite-svelte**
- Email + password login (better-auth). No public sign-up; admins invite users
- Roles:
  - **Admin**: everything, including users, categories and site settings
  - **Editor**: articles, polls, pages, comment moderation, uploads
- Chrome: sticky **top navbar** (logo, title, signed-in name + role, logout) plus a **left sidebar** with the section links. Full layout notes are in [docs/admin-chrome.md](docs/admin-chrome.md)
- Rich-text editor (e.g. Tiptap) for articles and pages, with image upload to R2, video embeds and poll embeds
- Screens: dashboard, articles, polls (with results), pages, categories, comments (with reported first), contact messages, media library, users

### Implementation notes (step 4)

- Screens: dashboard, articles (filters by text, status and category), article editor, pages, media library, plus categories and users for admins only (editors get a 403). Polls, comments and contact messages come with step 5
- Editor: Tiptap with subheadings, bold/italic/underline/strike, links, lists, quotes, separators, images from the media library (with caption and alt text), YouTube/Facebook videos and tables (so imported tables survive editing). It produces the same HTML the import does, and saving an imported article unchanged keeps its content
- Every save goes through a server-side allowlist sanitizer (`src/lib/server/sanitize.ts`, pure JS so it runs on Workers). Stored HTML keeps root-relative `/media/…` paths; the editor shows them with the media host and strips it again on save
- Articles: drafts, publish now, or schedule with a future date (Lisbon time). Only one article is featured at a time. Changing the address of a published article keeps the old one redirecting. Saves update the search index
- Images are resized in the browser (WebP via canvas, with a WASM encoder fallback for Safari) and the server only stores files. Variants are 480/960/1600 plus the image's own width when it's in between. New cover uploads are framed to 16:9 with a position slider; a cover picked from the library is cropped by CSS instead. Images in use can't be deleted
- Users: admins create accounts with a password to pass on, change roles and reset passwords. There's no self-service password change yet
- Page addresses that clash with site sections (`pesquisa`, `noticias`…) get a `-pagina` suffix. Changing a category's address breaks shared links to it, and the old-site tag redirects point at the original category slugs

### Implementation notes (step 5)

- **Turnstile**: `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`. Development uses Cloudflare's always-passing test keys; production needs a Turnstile widget for carapecos.com, with the secret set as a Worker secret. The widget is invisible unless Cloudflare wants a challenge, and Cloudflare's script only loads once a reader starts filling in a form or picks a poll option. Verification fails closed
- **Hashes**: IP hashes are HMAC-SHA256 keyed with `BETTER_AUTH_SECRET` and a per-feature label, so the same reader can't be linked across comments, votes and messages. Raw IPs are never stored
- **Polls**: `/sondagens/{slug}`, in the homepage feed and search, and embeddable in articles from the editor's "Sondagem" button (stored as `<div data-poll="slug"></div>`). Voting stays on the page the poll is on. One vote per browser (an httpOnly cookie remembering the last 80 polls, plus localStorage), Turnstile on every vote, and at most 5 votes per poll per IP + user agent per day (households share an IP). Votes of one reader share a ballot id, so multiple-choice polls count people, not ticks. Removing an option in the backoffice deletes its votes
- **Comments**: oldest first, one level of replies, plain text (no HTML, links not clickable). Limits per IP: 5 per 10 minutes and 30 per day, at most 2 links, and a blocked-words list in `src/lib/server/moderation.ts` (whole words, ignoring case and accents; a starting list to extend). "Reportar" flags a comment for editors and never hides it automatically. Hiding a comment hides its replies
- **Backoffice**: Sondagens (with results), Comentários (reported first; filters for reported and hidden; hide, keep, delete) and, for admins, Mensagens. The dashboard shows reported comments and unread messages
- **Pages**: migration 0005 seeds Contactos (which also shows the contact form), Política de privacidade and Regras dos comentários, all in the footer. **Their text is a draft to review**, especially the privacy policy
- Migrations 0003–0005 are applied to the local D1 only

### Implementation notes (step 6)

- **SEO**: every public page sets its title, description, canonical URL (from `ORIGIN`), Open Graph/Twitter tags and JSON-LD (`NewsArticle` for articles, `WebSite` + `NewsMediaOrganization` on the homepage, breadcrumbs on categories) through `Seo.svelte`. Pages without a cover use `static/og-default.png`. Social images are WebP variants, which the main networks accept
- **Feeds**: `/sitemap.xml` (every public URL), `/sitemap-news.xml` (last two days, Google News), `/rss.xml` (30 newest), `/robots.txt` (blocks `/admin`, `/api/`, `/pesquisa`), `/llms.txt`, and `/noticias/{slug}.md`
- **PWA**: `static/manifest.webmanifest` with icons, and `src/service-worker.ts`. Static files are precached; the app's JS/CSS is cached as it's used (so readers never download the backoffice code); pages are network-first with the last 40 kept for offline reading, images cache-first (150), and `static/offline.html` for anything else offline
- **Web push**: VAPID keys from `npm run vapid`. The footer has the opt-in (instructions on iPhone/iPad until the site is added to the home screen). Subscriptions are only accepted for the major push services, so the Worker can't be made to fetch arbitrary URLs. Sending is in batches of 40 per request, claimed with a cursor so two requests never send the same batch. The SvelteKit adapter has no cron trigger, so batches go out after an article is saved and, at most once a minute, after site requests; a scheduled article's notification starts with the first request after its publish time. Articles more than a day old never notify. Expired subscriptions are removed when push services report them gone
- **Launch prep**: `www.` redirects to the bare domain in `hooks.server.ts`; `npm run import -- --remote --env-file .env.production` imports into Cloudflare; optional Cloudflare Web Analytics via `CF_ANALYTICS_TOKEN`; the deployment and launch checklist is in [README.md](README.md)

## Import from the old site

The old site has no API, so the import is a scraper (about 1,150 articles across 115 listing pages at `/blog/pag/N/`).

- Imports title, date, body and images. Old comments, polls and view counts are **not** imported
- Images are downloaded, resized into the standard widths with sharp, and stored on R2. Image URLs in the body are rewritten
- Links in bodies that point to other old articles (`carapecos.com/blog/{id}` or `carapecos.blogtok.com/blog/{id}`) are rewritten to their new `/noticias/{slug}` URLs
- Bodies are mostly pasted from Word (`MsoNormal`, inline styles, HTML entities). Clean them up into the editor's format
- Old pages are ISO-8859-1. Convert to UTF-8
- Categories come from crawling the old tag pages (`/blog/tag/{tag}`) and applying the mapping table above
- One full import runs after posting on the old site stops (see Launch plan). The scraper should still be safe to re-run for testing: it skips articles it already has, by `legacyId`
- Redirects (301): `/blog/{id}/...` → the new article URL, `/blog/tag/{tag}` → its category, `/blog/pag/{n}/` → homepage

**Implementation** (`scripts/import/`, run with `npm run import`):

- Options: `--limit N` (newest N), `--only id,id`, `--force` (re-import, keeping slugs), `--refresh` (re-crawl listings). Downloaded pages and images are cached in `.import-cache/`
- Writes to the local D1 and the storage set in `.env`. Importing into the remote D1/R2 for launch still needs a `--remote` mode
- The old site lists 1,134 articles; 345 of them have no tag and default to Sociedade, including some that are clearly sports
- The first image becomes the cover and is removed from the body. A short first paragraph becomes the lead. Short, fully bold paragraphs become subheadings
- Redirects are handled in `hooks.server.ts`, because old URLs are ISO-8859-1 encoded and SvelteKit can't route them. The Vite dev server rejects those URLs before SvelteKit sees them, so they only work in the production build

## Requirements

- Mobile first. Desktop adapts as much as possible afterwards
- Public site uses a custom design system based on Apple's **Liquid Glass** design language: translucent layered surfaces, depth and fluid motion. Follow the `apple-design` skill ([.claude/skills/apple-design/SKILL.md](.claude/skills/apple-design/SKILL.md)) when building or reviewing public-site UI. Respect `prefers-reduced-motion` and `prefers-reduced-transparency`, and keep text contrast at WCAG AA on glass surfaces
- Dark and light mode: follows the system by default, the toggle overrides it and is remembered, no flash of the wrong theme on load
- PWA: installable, works well from the home screen, has an offline fallback page and caches recently read articles
- Web push: installed-app users can opt in to new-article notifications (on iOS this only works once the app is installed). Editors choose per article whether to send one
- Stack (already set up): SvelteKit on Cloudflare (adapter-cloudflare), Drizzle, better-auth, Tailwind, Paraglide
- Cloudflare D1 for the database, with FTS5 for search
- Cloudflare R2 for file storage
- Cloudflare Turnstile for comments, votes and the contact form
- Cloudflare Web Analytics (cookieless). Article views are counted in D1 for "most read", ignoring bots
- SEO, as much as possible: server-side rendering, canonical URLs, `sitemap.xml` + Google News sitemap, RSS feed, `NewsArticle` JSON-LD, Open Graph/Twitter cards using the cover image, fast Core Web Vitals
- LLM friendly, as much as possible: `llms.txt`, semantic HTML, JSON-LD, and a Markdown version of each article (e.g. `/noticias/{slug}.md`)

## Out of scope (for now)

Guestbook (Livro de Visitas), email newsletter, reader accounts, English version, photo galleries, author bylines, email notifications for contact messages, importing old comments/polls/view counts.

## Development environment

- **Database**: day-to-day development uses a **local D1** (the SQLite database Wrangler keeps in `.wrangler/state`), so it's fast, works offline and runs the exact same SQL as production. The existing Cloudflare D1 is a **test database** for preview deploys; a separate production D1 is created before launch
  - Drizzle generates the migrations (`npm run db:generate`); Wrangler applies them (`wrangler d1 migrations apply DB --local` or `--remote`)
- **File storage**: until the site is deployed, images are stored in a local **LocalStack** S3 at `http://localhost:4566` instead of R2
  - R2 speaks the S3 API, so the code talks S3 in every environment (e.g. with `aws4fetch`, which runs on Workers and Node). Only the settings change between LocalStack and R2: endpoint, bucket, access keys, and the public base URL for images
  - The same storage module is used by the backoffice uploads and by the import script
  - Public image URLs are built from a configurable base URL: the LocalStack bucket URL in development, an R2 custom domain (e.g. `media.carapecos.com`) in production

## Build order

1. **Foundation**: local D1 + migrations, database schema, storage module on LocalStack, backoffice login
2. **Import**: scraper, so the rest is built against the real ~1,150 articles
3. **Design system and public site**: homepage, article, category, search, dark mode
4. **Backoffice**: article/page editor, categories, media
5. **Polls and comments**, with Turnstile
6. **PWA, push, SEO and launch**

## Launch plan

carapecos.com's DNS isn't on Cloudflare yet, and the old site keeps getting new posts until it's frozen.

1. Build and test on the `workers.dev` preview URL, using test imports
2. Move carapecos.com's nameservers to Cloudflare. Copy every existing DNS record first so the old site and any domain email (MX records) keep working
3. Freeze the old site: no more posts there
4. Run the full import and check it: article count, images, categories, and a sample of old URLs redirecting correctly
5. Attach `carapecos.com` to the Worker as a custom domain, with `www.carapecos.com` 301-redirecting to it
6. Submit the new sitemap in Google Search Console and keep an eye on crawl errors for the old URLs
