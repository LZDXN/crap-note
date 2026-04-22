# Publish Claude Note

A self-hosted web app for **publishing and sharing notes generated from your Claude conversations**. Drop a Markdown, HTML, or PDF file in, get a clean shareable link out.

- **Upload** Markdown (`.md`), HTML (`.html`), and PDF (`.pdf`) files
- **Browse** all your notes in a searchable, filterable list
- **Share** each note at a unique URL (`/n/<id>`)
- **Read online** — rendered Markdown, sandboxed HTML, inline PDF
- **Download** the original file at any time
- **Responsive** — built mobile-first, works great on laptops too
- **Self-hosted** — your files live on your server, not in a third‑party SaaS

---

## Table of contents

1. [Tech stack](#tech-stack)
2. [Quickstart (local dev)](#quickstart-local-dev)
3. [Production build](#production-build)
4. [Project structure](#project-structure)
5. [Configuration](#configuration)
6. [Data storage](#data-storage)
7. [HTTP API](#http-api)
8. [Deployment](#deployment)
9. [Security notes](#security-notes)
10. [Roadmap](#roadmap)
11. [Contributing](#contributing)

---

## Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js 15** (App Router, TypeScript) | Single codebase for server + client; file-based routing gives free shareable URLs |
| Styling | **Tailwind CSS v4** | Mobile-first, tiny config, consistent design |
| Markdown | `marked` + `isomorphic-dompurify` (`jsdom`) | Server-rendered MD, safely sanitized |
| IDs | `nanoid` | Short, URL-safe, unguessable |
| Storage | Pluggable — **local filesystem** (default) or **Vercel Blob** | Zero-setup for dev; durable object storage in production |
| PDFs | Native browser `<object>` viewer | No bundled PDF.js to ship — faster loads |

> There is **no database**. Metadata lives in a single JSON index (either `data/notes.json` on disk or `notes/index.json` in Blob). The backend is selected automatically — if `BLOB_READ_WRITE_TOKEN` is set in the environment, Vercel Blob is used; otherwise the filesystem is used.

---

## Quickstart (local dev)

**Requirements**

- Node.js `>= 18.18` (Node 20 or 22 LTS recommended)
- npm (or pnpm / yarn — pick your favorite)

**Run it**

```bash
git clone <your fork of this repo>
cd publish-claude-note

npm install --legacy-peer-deps   # React 19 peer-dep hint; see note below
npm run dev

# open http://localhost:3000
```

The first upload creates `data/` automatically. That folder is git-ignored.

> **About `--legacy-peer-deps`** — React 19 is still newer than some peer-dep ranges in the wild. The flag silences harmless warnings during install. You can drop it once every transitive peer catches up.

---

## Production build

```bash
npm run build          # type-checks + builds /.next
npm run start          # serves the built app on PORT (default 3000)

# or bind a specific port:
PORT=8080 npm run start
```

Smoke test:

```bash
curl -F "file=@./my-note.md" http://localhost:8080/api/notes
```

---

## Project structure

```
publish-claude-note/
├── app/
│   ├── layout.tsx                  # root layout (fonts, <body>)
│   ├── page.tsx                    # home: upload + file list (server component)
│   ├── globals.css                 # Tailwind + design tokens + .prose-note
│   ├── _components/
│   │   ├── HomeClient.tsx          # client: uploader, search, filter, cards
│   │   ├── ViewerActions.tsx       # client: copy-link + download buttons
│   │   ├── HtmlViewer.tsx          # client: sandboxed iframe + auto-resize
│   │   ├── PdfViewer.tsx           # client: <object> inline PDF
│   │   └── KindIcon.tsx            # shared MD/HTML/PDF badge
│   ├── n/
│   │   └── [id]/
│   │       ├── page.tsx            # single-note viewer (server component)
│   │       └── not-found.tsx       # custom 404
│   └── api/
│       └── notes/
│           ├── route.ts            # GET list · POST upload
│           └── [id]/
│               ├── route.ts        # GET meta · PATCH title · DELETE
│               └── raw/route.ts    # inline/attachment download of the file bytes
├── lib/
│   ├── storage/
│   │   ├── index.ts                # picks backend based on BLOB_READ_WRITE_TOKEN
│   │   ├── fs.ts                   # filesystem backend (data/ folder)
│   │   └── blob.ts                 # Vercel Blob backend
│   ├── render.ts                   # marked + DOMPurify sanitizer
│   ├── format.ts                   # bytes, relative time, labels
│   └── types.ts                    # NoteRecord, kind detection, MIME map
├── data/                           # ← created at runtime, git-ignored
│   ├── notes.json
│   └── files/
│       └── <id>.<ext>
├── Examples/                       # sample uploads (ignored by the app)
├── next.config.ts
├── tailwind.config (via globals.css @theme)
├── tsconfig.json
├── postcss.config.mjs
└── package.json
```

---

## Configuration

The app runs with zero required configuration. Optional environment variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | Port for `next start` |
| `HOSTNAME` | `0.0.0.0` | Bind address for `next start` |
| `BLOB_READ_WRITE_TOKEN` | *(unset)* | **Switches storage to Vercel Blob.** When unset, the filesystem backend is used. |

Upload size limit is `50 MB`. Change it in `lib/types.ts` (`MAX_UPLOAD_BYTES`) **and** in `next.config.ts` (`serverActions.bodySizeLimit`).

---

## Data storage

The storage backend is chosen automatically based on the environment. A small badge in the home-page header shows which backend is active (`Local FS` or `Vercel Blob`).

### Filesystem backend (default)

Everything lives under `./data`:

```
data/
├── notes.json           # the metadata index (sortable/editable by hand)
└── files/
    ├── AbCd1234eF.md
    ├── GhIj5678kL.html
    └── MnOp9012qR.pdf
```

- **Back up**: copy the whole `data/` folder.
- **Migrate**: drop that folder onto the new server and restart.

### Vercel Blob backend

Activated by setting `BLOB_READ_WRITE_TOKEN`. When active:

- File contents live in Blob at `notes/files/<id>.<ext>` (random suffix added by Vercel).
- The metadata index lives at `notes/index.json` in Blob.
- The store is configured with **private access** — every read (inline or download) is streamed through `/api/notes/:id/raw`, never served directly from a public CDN URL. This keeps the door open to add per-note authentication later without re-uploading anything.

#### Set up Vercel Blob

1. In the Vercel dashboard: **Storage → Create Database → Blob**.
2. Connect the store to your project; Vercel injects `BLOB_READ_WRITE_TOKEN` automatically in production.
3. For local development, pull the env var down:

   ```bash
   npx vercel env pull .env.local
   # or paste BLOB_READ_WRITE_TOKEN=vercel_blob_rw_... into .env.local yourself
   ```

4. Restart `npm run dev`. The badge in the header should flip from `Local FS` to `Vercel Blob`.

> **Mixing backends**: a note created under one backend lives *only* in that backend. If you switch, the old notes disappear from the UI until you switch back (they aren't deleted). To migrate existing FS notes into Blob, upload them again while Blob is active.

### Metadata shape (both backends)

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
  "blobUrl": "https://...public.blob.vercel-storage.com/...",
  "blobPathname": "notes/files/AbCd1234eF-abc123.md"
}
```

`blobUrl` and `blobPathname` are present only for notes stored in Blob.

---

## HTTP API

All endpoints return JSON (except `/raw`, which streams the file).

| Method | Path | Body | Returns |
|--------|------|------|---------|
| `GET`  | `/api/notes` | — | `{ notes: NoteRecord[] }` (newest first) |
| `POST` | `/api/notes` | `multipart/form-data` with `file` (and optional `title`) | `{ note: NoteRecord }` · `201` |
| `GET`  | `/api/notes/:id` | — | `{ note: NoteRecord }` |
| `PATCH`| `/api/notes/:id` | `{ "title": "New title" }` | `{ note: NoteRecord }` |
| `DELETE`| `/api/notes/:id` | — | `{ ok: true }` |
| `GET`  | `/api/notes/:id/raw` | — | file bytes, `Content-Disposition: inline` |
| `GET`  | `/api/notes/:id/raw?download=1` | — | file bytes, `Content-Disposition: attachment` |

Examples:

```bash
# upload
curl -F "file=@./notes.md" http://localhost:3000/api/notes

# list
curl http://localhost:3000/api/notes | jq

# rename
curl -X PATCH -H 'content-type: application/json' \
  -d '{"title":"Econ 101 - midterm prep"}' \
  http://localhost:3000/api/notes/AbCd1234eF

# delete
curl -X DELETE http://localhost:3000/api/notes/AbCd1234eF
```

Shareable viewer URL: `https://<your-host>/n/<id>`.

---

## Deployment

### Option A — any Node host (simplest)

```bash
npm ci --legacy-peer-deps
npm run build
PORT=8080 npm run start
```

Put nginx / Caddy / Cloudflare in front for HTTPS. Make sure the process has write access to a persistent `data/` directory.

### Option B — Docker

Create a `Dockerfile`:

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
docker build -t publish-claude-note .
docker run -d -p 3000:3000 -v $PWD/data:/app/data publish-claude-note
```

### Option C — Vercel (recommended for a shareable public instance)

Vercel's function filesystem is read-only at runtime, so the filesystem backend doesn't work there. Use the Vercel Blob backend instead:

1. Push the repo to GitHub and import it into Vercel.
2. In the project, open **Storage → Create Database → Blob → Connect**. Vercel sets `BLOB_READ_WRITE_TOKEN` automatically for all deployments (Preview + Production).
3. Redeploy. That's it — uploads now land in Blob and viewer links stream bytes through your serverless function.

No other code changes needed; the app detects the env var and switches backends at boot.

### Option D — systemd (VPS)

`/etc/systemd/system/publish-claude-note.service`

```ini
[Unit]
Description=Publish Claude Note
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/publish-claude-note
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm run start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now publish-claude-note
```

---

## Security notes

The app is **public by default** — anyone with the URL can view and upload. Design choices that matter:

- **IDs are 10-char nanoids** (URL-safe, ~63 bits of entropy). Links are unguessable but not cryptographically secret — treat them like "unlisted YouTube" URLs, not passwords.
- **Markdown is rendered server-side** through `marked` and then passed through `DOMPurify` (with `jsdom`). Script tags, inline event handlers, and `javascript:` URLs are stripped.
- **HTML files are rendered inside a sandboxed `<iframe>`** (`allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-scripts`). They execute, but they cannot reach the top frame's DOM or cookies from a different origin. If you host untrusted HTML, consider serving `/api/notes/:id/raw` from a **separate origin** (e.g. `files.your-domain.com`) so the sandbox is a true cross-origin boundary.
- **PDFs are served with `Content-Disposition: inline`** and the browser's own viewer renders them — no JS parsing in our page.
- **Uploads are capped at 50 MB** per file and the file extension / MIME type is validated.

**Before deploying publicly**, seriously consider adding:

1. Authentication (put it behind your SSO or a basic-auth reverse proxy)
2. Rate-limiting on `POST /api/notes`
3. A separate origin for `/api/notes/:id/raw` to harden the HTML iframe

---

## Roadmap

- [ ] Optional auth (single-user password, or OIDC)
- [ ] Syntax highlighting in Markdown (shiki)
- [ ] Tags / collections
- [ ] Server-rendered PDF thumbnails
- [ ] S3 / R2 storage adapter (drop-in replacement in `lib/storage/`)
- [ ] Paste-in Markdown (skip the upload step)
- [ ] `.docx` and `.txt` support

---

## Contributing

1. Fork & clone
2. `npm install --legacy-peer-deps`
3. `npm run dev`
4. Make a branch, open a PR. New viewers should live in `app/_components/*Viewer.tsx` and be wired into `app/n/[id]/page.tsx`.

Bug reports and PRs welcome.

---

## License

MIT — do whatever you want, just don't blame us if something breaks. See `LICENSE` if present, otherwise the repository default.
