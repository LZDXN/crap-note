# Crap Notes

A tiny self-hosted web app for **sharing your notes** — drop a Markdown, HTML, or PDF file in and get a clean, read-only page back. Built originally to publish notes from Claude conversations, but it works for anything you want to read or share.

- **Private by default** — uploads start hidden; one click to publish a shareable link
- **Pin to top** — important notes get a "Pinned" section above the regular list
- **Admin-only uploads** behind username + password
- **Public list** at `/` shows only published notes; signed-in admin sees everything
- **Per-note viewer** at `/n/<id>` — rendered Markdown (with KaTeX math), sandboxed HTML, inline PDF
- **Friendly 404** for deleted, missing, or private notes
- **Mobile-friendly** — header collapses to icon-only buttons, cards reflow to one column
- **Duplicate-upload rejection** (SHA-256 content hash)
- **Upload progress** with abort-on-refresh so half-uploaded files never persist
- **Pluggable storage** — local filesystem for dev, Vercel Blob (private access) for production
- **No database, no third-party SaaS** — metadata is a JSON index, files live next to it

---

## Table of contents

- [Crap Notes](#crap-notes)
  - [Table of contents](#table-of-contents)
  - [Tech stack](#tech-stack)
  - [Quickstart](#quickstart)
  - [Admin auth](#admin-auth)
  - [Production build](#production-build)
  - [Project structure](#project-structure)
  - [Configuration](#configuration)
  - [Data storage](#data-storage)
    - [Filesystem backend (default)](#filesystem-backend-default)
    - [Vercel Blob backend](#vercel-blob-backend)
    - [Metadata shape](#metadata-shape)
  - [HTTP API](#http-api)
  - [Deployment](#deployment)
    - [Vercel (recommended)](#vercel-recommended)
    - [Any Node host](#any-node-host)
    - [Docker](#docker)
  - [Security notes](#security-notes)
  - [License](#license)

---

## Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js 15** (App Router, TypeScript) | Single codebase for server + client; file-based routing gives free shareable URLs |
| Styling | **Tailwind CSS v4** | Mobile-first, tiny config, consistent design |
| Markdown | `marked` + `DOMPurify` (`jsdom`) | Server-rendered MD, sanitized |
| IDs | `nanoid` (10 chars) | Short, URL-safe, unguessable |
| Auth | HMAC-signed cookie (SHA-256), stateless | Zero infra, single-admin |
| Storage | **Local filesystem** or **Vercel Blob** (private) | Zero-setup dev; durable object storage in prod |
| PDFs | Native browser `<object>` viewer | No bundled PDF.js |

> **No database.** Metadata lives in a single JSON index (`data/notes.json` on disk, or `notes/index.json` in Blob). The backend is selected automatically — if `BLOB_READ_WRITE_TOKEN` is set, Vercel Blob is used; otherwise the filesystem.

---

## Quickstart

**Requirements**: Node.js `>= 18.18` (Node 20 or 22 LTS recommended).

```bash
git clone <your fork>
cd crap-notes

npm install --legacy-peer-deps   # React 19 peer-dep hint — see note below
```

Copy the example env file and fill in the three admin variables (see [Admin auth](#admin-auth) for how to generate them):

```bash
cp .env.local.example .env.local
# then edit .env.local — set ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_SESSION_SECRET
```

Then start the dev server:

```bash
npm run dev
# open http://localhost:6969
```

**First run**

1. Visit [`/admin/login`](http://localhost:6969/admin/login) and sign in with the credentials you just set.
2. You'll land at `/admin` — drop in a `.md`, `.html`, or `.pdf` file.
3. New uploads are **private by default**. Click **Publish** on a note to make its `/n/<id>` link publicly viewable.
4. Click the **pin icon** on a note to surface it in the "Pinned" section at the top of the home page.
5. The home page at `/` shows only published notes to anyone not signed in. Signed-in admin sees all notes with a public/private badge.

The first upload creates `data/` automatically. That folder is git-ignored.

> **About `--legacy-peer-deps`** — React 19 is newer than some peer-dep ranges in the wild. The flag silences harmless warnings during install.

> **No `.env.local`?** The app still runs but auth is disabled and uploads are open to anyone. Only do this on a machine nobody else can reach.

---

## Admin auth

Only the admin can upload, delete, or rename notes. Everyone else sees a read-only list and individual note pages.

Set three env vars in `.env.local`:

```bash
ADMIN_USERNAME="ADMIN"
ADMIN_PASSWORD="<paste a long random string>"
ADMIN_SESSION_SECRET="<paste a different long random string>"
```

Generate both random values with:

```bash
node -e "const c=require('node:crypto');console.log('PASSWORD='+c.randomBytes(32).toString('base64url'));console.log('SECRET='+c.randomBytes(48).toString('base64url'));"
```

Then **restart the dev server** (env changes aren't hot-reloaded) and sign in at [`/admin/login`](http://localhost:6969/admin/login). On success you land at `/admin`, which is the upload + management portal.

**Session cookie**: HMAC-signed (SHA-256) JSON payload, `httpOnly` + `sameSite=lax`, 7-day TTL. Rotating `ADMIN_SESSION_SECRET` or changing `ADMIN_USERNAME` invalidates all existing sessions.

**Login brute-force protection**: 5 attempts per minute per IP.

**Fallback**: if you start the server with none of the admin env vars set, the auth gate is disabled and all routes behave as they did before. Only do this on a machine that nobody else can reach.

---

## Production build

```bash
npm run build          # type-checks + builds /.next
npm run start          # serves on PORT (default 3000)
```

Make sure the three `ADMIN_*` env vars are set for the `start` command too.

---

## Project structure

```
crap-notes/
├── app/
│   ├── layout.tsx                  # root layout (fonts, <body>)
│   ├── page.tsx                    # home: public read-only list (server component)
│   ├── error.tsx                   # global error boundary — big "XD"
│   ├── globals.css                 # Tailwind + design tokens + .prose-note
│   ├── _components/
│   │   ├── HomeClient.tsx          # client: Pinned section + search/filter + Craps grid + copy/download
│   │   ├── Footer.tsx              # shared footer with GitHub source link
│   │   ├── ViewerActions.tsx       # client: copy-link + download buttons
│   │   ├── HtmlViewer.tsx          # client: sandboxed iframe (no same-origin)
│   │   ├── PdfViewer.tsx           # client: <object> inline PDF
│   │   └── KindIcon.tsx            # shared MD/HTML/PDF badge
│   ├── admin/
│   │   ├── page.tsx                # admin portal (server: requires session)
│   │   ├── login/page.tsx          # login form (server: redirects if already signed in)
│   │   └── _components/
│   │       ├── AdminClient.tsx     # uploader + manage list with pin / publish / delete toggles
│   │       └── LoginClient.tsx     # username/password form
│   ├── n/[id]/
│   │   ├── page.tsx                # single-note viewer (server component, gates private notes)
│   │   └── not-found.tsx           # friendly 404 (deleted / missing / private)
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts      # POST — set session cookie (rate-limited)
│       │   ├── logout/route.ts     # POST — clear cookie
│       │   └── session/route.ts    # GET  — { authenticated, configured }
│       └── notes/
│           ├── route.ts            # GET list (visibility-filtered) · POST upload (admin only)
│           └── [id]/
│               ├── route.ts        # GET meta · PATCH title/visibility/pinned · DELETE (admin only)
│               └── raw/route.ts    # streamed file bytes (rate-limited, private-gated)
├── lib/
│   ├── session.ts                  # HMAC cookie sign/verify, credential check
│   ├── rate-limit.ts               # in-memory per-IP fixed-window limiter
│   ├── storage/
│   │   ├── index.ts                # picks backend from BLOB_READ_WRITE_TOKEN
│   │   ├── fs.ts                   # filesystem backend
│   │   └── blob.ts                 # Vercel Blob backend (private access)
│   ├── render.ts                   # marked + DOMPurify sanitizer (+ KaTeX inline/block math)
│   ├── format.ts                   # bytes, relative time, labels
│   └── types.ts                    # NoteRecord + visibility/pin types, filename + Content-Disposition helpers
├── data/                           # ← created at runtime, git-ignored
│   ├── notes.json
│   └── files/<id>.<ext>
├── examples/                       # sample uploads (ignored by the app)
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
└── package.json
```

---

## Configuration

| Variable | Required? | Purpose |
|----------|-----------|---------|
| `ADMIN_USERNAME` | Yes (for auth) | Admin login name |
| `ADMIN_PASSWORD` | Yes (for auth) | Admin password — plaintext, compare is constant-time |
| `ADMIN_SESSION_SECRET` | Yes (for auth) | HMAC key for session cookies |
| `BLOB_READ_WRITE_TOKEN` | Only for Blob backend | Switches storage to Vercel Blob (private access) |
| `PORT` | No (default `3000`) | Port for `next start` |
| `HOSTNAME` | No (default `0.0.0.0`) | Bind address for `next start` |

Upload size limit is `50 MB`. Change it in [`lib/types.ts`](lib/types.ts) (`MAX_UPLOAD_BYTES`) **and** [`next.config.ts`](next.config.ts) (`serverActions.bodySizeLimit`).

---

## Data storage

The storage backend is chosen automatically. A small badge in the home-page refresh-button tooltip shows which is active (`Local FS` or `Vercel Blob`).

### Filesystem backend (default)

Everything lives under `./data`:

```
data/
├── notes.json           # the metadata index (editable by hand)
└── files/
    ├── AbCd1234eF.md
    ├── GhIj5678kL.html
    └── MnOp9012qR.pdf
```

Back up: copy the `data/` folder. Migrate: drop it onto the new server and restart.

### Vercel Blob backend

Activated by setting `BLOB_READ_WRITE_TOKEN`. When active:

- File contents live in Blob at `notes/files/<id>.<ext>` (random suffix added by Vercel).
- The metadata index lives at `notes/index.json`.
- The store is configured with **private access**. Every read (inline or download) is streamed through `/api/notes/:id/raw` — nothing is served from a public CDN URL. This keeps the door open to per-note ACLs later without reuploading.

**Set up**: in the Vercel dashboard, **Storage → Create Database → Blob**, connect it to your project, then pull env vars locally:

```bash
npx vercel env pull .env.local
```

> **Mixing backends**: a note only exists in the backend that stored it. Switching env vars doesn't migrate data — old notes just stop appearing in the UI until you switch back. To actually move notes, re-upload them while the target backend is active.

### Metadata shape

```json
{
  "id": "AbCd1234eF",
  "slug": "my-note",
  "title": "My note",
  "kind": "markdown",
  "originalName": "my-note.md",
  "storedFileName": "AbCd1234eF.md",
  "mimeType": "text/markdown",
  "size": 18150,
  "createdAt": "2026-04-21T12:34:56.000Z",
  "updatedAt": "2026-04-21T12:34:56.000Z",
  "contentHash": "…sha256 hex…",
  "blobUrl": "https://....blob.vercel-storage.com/...",
  "blobPathname": "notes/files/AbCd1234eF-abc123.md",
  "visibility": "private",
  "pinned": false
}
```

`blobUrl` / `blobPathname` are present only for Blob-stored notes. `contentHash` is present for any note uploaded since dedup was added. `visibility` is `"public"` or `"private"`; records written before this field existed are treated as `"public"` so old shared links keep working. `pinned` notes appear in the **Pinned** section above the regular list on the home page; default `false`.

---

## HTTP API

| Method | Path | Auth | Returns |
|--------|------|------|---------|
| `GET`  | `/api/notes` | Public (filtered) / Admin (all) | `{ notes: NoteRecord[] }` — public callers only see `visibility: "public"` notes |
| `POST` | `/api/notes` | **Admin** | `{ note }` · `201` — uploads default to `private`; rejects duplicates with `409` + reference to existing note |
| `GET`  | `/api/notes/:id` | Public for public notes / Admin for private | `{ note }` — private notes return `404` to non-admins (hides existence) |
| `PATCH`| `/api/notes/:id` | **Admin** | `{ note }` — body: `{ "title": "…" }`, `{ "visibility": "public" \| "private" }`, or `{ "pinned": boolean }` |
| `DELETE`| `/api/notes/:id` | **Admin** | `{ ok: true }` |
| `GET`  | `/api/notes/:id/raw` | Public for public notes (rate-limited 60/min/IP) / Admin for private | file bytes, `Content-Disposition: inline` — `404` for private notes when not signed in |
| `GET`  | `/api/notes/:id/raw?download=1` | Same as above | file bytes, `attachment` |
| `POST` | `/api/auth/login` | Public (rate-limited 5/min/IP) | `{ ok: true }` — body: `{ username, password }` |
| `POST` | `/api/auth/logout` | Public | `{ ok: true }` — clears cookie |
| `GET`  | `/api/auth/session` | Public | `{ authenticated, configured }` |

Admin endpoints respond `401` when no session cookie is present (or an invalid one). Upload rejects non-multipart bodies with `400`, files over `MAX_UPLOAD_BYTES` with `413`, and unsupported types with `400`. Private-note endpoints return `404` (not `403`) for non-admins so the existence of a private note isn't leaked.

Shareable viewer URL: `https://<your-host>/n/<id>`.

---

## Deployment

### Vercel (recommended)

1. Push to GitHub, import to Vercel.
2. **Storage → Create Database → Blob → Connect**. `BLOB_READ_WRITE_TOKEN` is injected for all deployments.
3. Under **Settings → Environment Variables**, add `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`.
4. Redeploy.

Vercel's function filesystem is read-only at runtime, so the FS backend doesn't work there. Blob is the only path.

### Any Node host

```bash
npm ci --legacy-peer-deps
npm run build
ADMIN_USERNAME=… ADMIN_PASSWORD=… ADMIN_SESSION_SECRET=… PORT=8080 npm run start
```

Put nginx / Caddy / Cloudflare in front for HTTPS. Make sure the process has write access to a persistent `data/` directory if you're on the FS backend.

### Docker

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
EXPOSE 3000
VOLUME ["/app/data"]
CMD ["npm","run","start"]
```

```bash
docker build -t crap-notes .
docker run -d -p 3000:3000 \
  -e ADMIN_USERNAME=… -e ADMIN_PASSWORD=… -e ADMIN_SESSION_SECRET=… \
  -v $PWD/data:/app/data crap-notes
```

---

## Security notes

- **IDs are 10-char nanoids** (~63 bits of entropy). Links are unguessable but not cryptographically secret — treat them like "unlisted YouTube" URLs.
- **Markdown** is rendered server-side through `marked`, then `DOMPurify` strips scripts, inline event handlers, and `javascript:` URLs.
- **HTML** files render inside a sandboxed `<iframe>` with `sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"` — **no `allow-same-origin`**. Uploaded HTML runs in a null origin, so it cannot read the parent DOM, admin cookies, or call credentialed APIs. Trade-off: the iframe can't report its content height cross-origin, so it takes the full viewport and scrolls internally.
- **PDFs** serve with `Content-Disposition: inline` and the browser's native viewer renders them — no JS in our page.
- **Filenames** are sanitized before persisting (CR/LF/control chars stripped, path separators and leading dots replaced) to defend against HTTP response-splitting and traversal attempts at the boundary.
- **`Content-Disposition`** is RFC 6266 compliant: ASCII fallback + `filename*=UTF-8''…` for non-ASCII names.
- **Dedup**: SHA-256 of the upload bytes is compared against existing notes' `contentHash`. Duplicates return `409` with a pointer to the original.
- **Rate limits**: login `5/min/IP`, raw file reads `60/min/IP`. In-memory per-process — behind a load balancer, limits are per-instance.
- **Admin password** is stored plaintext in env. Comparison is constant-time. For a single-admin self-host this is fine; rotate the secret and password if you ever suspect exposure.

**Hardening ideas** if you deploy to a hostile network:

- Serve `/api/notes/:id/raw` from a **separate origin** (e.g. `raw.your-domain.com`) so HTML notes are truly cross-origin even if someone flips `allow-same-origin` back on.
- Put the app behind your SSO / OAuth reverse proxy instead of the built-in password.
- Store the admin password as a bcrypt/argon2 hash instead of plaintext.

---

## License

[MIT](LICENSE) — do whatever you want, just don't blame anyone if something breaks.
