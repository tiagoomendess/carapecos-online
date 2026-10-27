# Backoffice chrome

The logged-in `/admin` shell is a **sticky top navbar** plus a **left sidebar**. Section links live only in the sidebar. Login (`/admin/login`) and first-admin setup (`/admin/setup`) have no chrome.

Source of truth: `src/routes/admin/+layout.svelte` and `src/routes/admin/admin.css`. Product copy is in `messages/pt-pt.json`.

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│ ☰  logo  Backoffice              Nome · Papel        Sair  │  ← navbar (h-16, sticky)
├──────────────┬──────────────────────────────────────────────┤
│ CONTEÚDO     │                                              │
│  Painel      │                                              │
│  Artigos     │                                              │
│  Sondagens   │           page <main>                        │
│  Páginas     │                                              │
│  Multimédia  │                                              │
│              │                                              │
│ MODERAÇÃO    │                                              │
│  Comentários │                                              │
│  Mensagens*  │                                              │
│              │                                              │
│ DEFINIÇÕES*  │                                              │
│  Categorias  │                                              │
│  Utilizadores│                                              │
│              │                                              │
│ Ver o site ↗ │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

`*` Admin-only. Editors never see those links; the matching routes still 403 if hit directly (`requireAdmin` in `src/lib/server/admin.ts`).

| Region | What it holds | What it must not hold |
|---|---|---|
| **Navbar** | Logo + “Backoffice”, signed-in name and role, logout, mobile menu button | Section links (Artigos, Sondagens, …) |
| **Sidebar** | Grouped section links + “Ver o site” | Logout, user identity |
| **Content** | Each page’s own `<main class="mx-auto max-w-* p-4">` | A second site-wide nav |

On `md` and up the sidebar is always visible and the content column has `md:ms-64` (the sidebar is `w-64`). Below `md` the sidebar is a drawer: the hamburger toggles it, a backdrop / Escape / a nav click / any navigation closes it.

The sidebar is `fixed` and offset under the navbar by `.admin-sidebar` (`top: 4rem; height: calc(100dvh - 4rem)`). Flowbite’s `<Sidebar>` is used with `disableBreakpoints` so the `<aside>` is in the SSR HTML; show/hide is CSS (`hidden md:block`, plus `block` when the drawer is open). Do not switch back to Flowbite’s JS breakpoint — that waits for `innerWidth` and leaves the nav missing on first paint. Do not put nav items back in `NavUl`.

## Files

| File | Role |
|---|---|
| `src/routes/admin/+layout.svelte` | Chrome: navbar, sidebar groups, `activeUrl`, role gating |
| `src/routes/admin/+layout.server.ts` | Exposes `{ name, email, role }` or `null` |
| `src/routes/admin/admin.css` | Tailwind + Flowbite for `/admin`; `.admin-sidebar` offset |
| `src/hooks.server.ts` | `/admin` login gate (`/admin/login` and `/admin/setup` stay public) |
| `src/lib/server/admin.ts` | `requireUser` / `requireAdmin` on loads and actions |
| `messages/pt-pt.json` | All labels (`admin_nav_*`, `admin_nav_group_*`, `admin_menu`, `admin_logout`, …) |

Page files under `src/routes/admin/**` only render their `<main>`. They do not wrap themselves in another sidebar.

## Navigation groups

Highlight uses the longest matching href, so `/admin/artigos/novo` keeps **Artigos** active. `/admin` itself must stay the last match among prefixes (it is listed first and only wins on an exact path).

| Group | Keys | href | Who |
|---|---|---|---|
| Conteúdo | `admin_nav_group_content` | | everyone |
| | `admin_nav_dashboard` | `/admin` | everyone |
| | `admin_nav_articles` | `/admin/artigos` | everyone |
| | `admin_nav_polls` | `/admin/sondagens` | everyone |
| | `admin_nav_pages` | `/admin/paginas` | everyone |
| | `admin_nav_media` | `/admin/multimedia` | everyone |
| Moderação | `admin_nav_group_moderation` | | everyone |
| | `admin_nav_comments` | `/admin/comentarios` | everyone |
| | `admin_nav_messages` | `/admin/mensagens` | admin |
| Definições | `admin_nav_group_settings` | | admin |
| | `admin_nav_categories` | `/admin/categorias` | admin |
| | `admin_nav_users` | `/admin/utilizadores` | admin |
| Footer | `admin_view_site` | `/` (new tab) | everyone |

The menu button label is `admin_menu` (“Menu”). The drawer backdrop is `admin_menu_close` (“Fechar o menu”). Roles in the navbar use `admin_role_admin` / `admin_role_editor`.

When you add a screen:

1. Add the route under `src/routes/admin/…`
2. Add a Paraglide key and put the link in the right group in `+layout.svelte`
3. Gate the load/action with `requireUser` or `requireAdmin`
4. Keep the page as a `<main>` only — the chrome already wraps it

## Components (Flowbite-Svelte)

- **Navbar** + **NavBrand** — top bar, `fluid`, `sticky top-0 z-60 h-16`
- **Sidebar** + **SidebarWrapper** + **SidebarGroup** + **SidebarItem** — left nav
- `Sidebar.isOpen` is not bindable; pass `isOpen={sidebarOpen}` and `closeSidebar={() => (sidebarOpen = false)}`
- `SidebarGroup` with `border` **replaces** `class`, so “Ver o site” sits in a `mt-auto` wrapper
- The hamburger is a local `<button>`, not Flowbite’s `SidebarButton`, so the accessible name stays `admin_menu` (pt-PT) instead of the library’s English “Open sidebar”

## Out of chrome

- `/admin/login` and `/admin/setup` — centered card, no navbar/sidebar (`data.user` is null)
- `/admin/api/*` — JSON, no layout UI
- Public site (`src/routes/(site)/`) — its own header; do not reuse this chrome
