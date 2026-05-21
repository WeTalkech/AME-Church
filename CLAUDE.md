# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start        # Run production server (reads .env)
npm run dev      # Run with nodemon (auto-restart on file changes)
npm run prod     # Start with PM2 (production process manager)
npm run backup   # Backup the SQLite DB (legacy - now using Supabase)
```

## Environment Setup

Copy `.env.example` to `.env` and fill in:
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — server-side Supabase access
- `SESSION_SECRET` — any long random string (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `DATABASE_URL` — not currently used (sessions handled via Supabase JS client)

The server seeds default data (admin user, site settings, sample posts) on first start if the tables are empty.

## Architecture

**Stack:** Node.js + Express, Supabase (PostgreSQL + Storage), plain HTML/CSS/JS (no frontend framework).

**Entry point:** `server.js` — loads env, configures Express middleware, registers routers, calls `seedDatabase()` then starts listening.

### Request flow

```
Browser → Express → middleware/auth.js → routes/* → database.js (Supabase client)
```

- Static assets served from `public/` at `/static/` and `assets/` at `/assets/`
- All uploaded images go to **Supabase Storage** bucket `church-uploads` (not local disk)
- Sessions stored in Supabase table `church_session` via the custom `lib/supabase-store.js`

### Route structure

| Mount point | File | Purpose |
|---|---|---|
| `/api/auth` | `routes/auth.js` | Login, logout, session status |
| `/api/admin/users` | `routes/users.js` | User management (super_admin only) |
| `/api` | `routes/posts.js` | Public + admin CRUD for posts, settings, messages, file upload |
| `/` | `routes/pages.js` | HTML page serving + sitemap + robots.txt |

### Database

All Supabase tables are prefixed `church_` to avoid conflicts with other apps sharing the project:
- `church_users` — admin accounts
- `church_posts` — all content (sermons, events, programs, updates, gallery)
- `church_contact_messages` — contact form submissions
- `church_site_settings` — key/value church info (name, address, service times, etc.)
- `church_session` — session storage

Schema is in `migrations/schema.sql`. Run it manually in the Supabase SQL Editor when setting up a new environment. The `get_post_stats()` PostgreSQL function in that file is used by the dashboard stats endpoint.

### Auth & roles

Two roles stored in `church_users.role`:
- `super_admin` — full access including Settings and User Management
- `editor` — can only create/manage posts and read messages

Session stores `userId`, `username`, and `role`. Middleware in `middleware/auth.js`:
- `requireAuthAPI` — returns 401 JSON if not logged in (for API routes)
- `requireSuperAdmin` — returns 403 JSON if not super_admin (for API routes)
- `requireSuperAdminPage` — redirects to dashboard if not super_admin (for page routes)

Role-based sidebar visibility is handled client-side in `public/js/admin.js` via `initAdminNav()` — elements with class `super-admin-only` are hidden for editors.

### Content model

All content is a single `church_posts` table with a `type` column: `sermon`, `event`, `program`, `update`, `gallery`. Type-specific fields (e.g. `scripture`, `speaker` for sermons; `event_date`, `recurrence` for events) are nullable columns on the same table. The `recurrence` field stores values like `every-sunday`, `every-wednesday` etc. for recurring events.

### Frontend

No build step — plain HTML files in `views/`, CSS in `public/css/`, JS in `public/js/`. Admin pages load `admin.js` first (shared utilities), then a page-specific script. Public pages load `main.js` (shared nav, card builder, modal) then a page-specific script.

The `buildCard()` function in `main.js` renders post cards across all public pages. The post detail modal is also in `main.js` and shared across pages.

### Image uploads

Multer uses `memoryStorage()` — files are never written to disk. The upload endpoint (`POST /api/admin/upload`) streams the buffer directly to Supabase Storage and returns the public CDN URL.

## Deployment

- Uses **PM2** (`ecosystem.config.js`) for process management
- Sits behind **Cloudflare** — `app.set('trust proxy', 1)` is required
- In production: set `NODE_ENV=production`, `SESSION_SECRET`, and all Supabase env vars
- `SESSION_SECRET` must be set or the server throws on startup in production
