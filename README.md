# InvoiceRaider

A modern, self-hosted invoice management platform for freelancers and small to medium-sized businesses. Built with a SvelteKit frontend and a Deno/Hono backend, packaged as a single Docker container.

---

## Features

- **Invoice Management** — Create, edit, and track invoices with draft/sent/paid/overdue/voided statuses and public share links
- **Customer Database** — Store contact info, tax IDs, company details, and country codes
- **Product Catalog** — Define products and services with pricing, units, SKUs, and tax categories
- **Template Engine** — Multiple built-in templates (Professional Modern, Minimalist Clean, Slate, Nova) with custom upload support
- **Export Formats** — PDF, UBL 2.1, Factur-X (ZugFeRD), FatturaPA, and PEPPOL-compatible XML
- **Multi-User & Permissions** — Role-based access control with a fine-grained resource/action permission matrix
- **Two-Factor Authentication** — TOTP (authenticator app) with recovery codes
- **OpenID Connect** — Optional OIDC integration for SSO
- **Email Sending** — Send invoices via SMTP with PDF attachments; supports multiple email configurations
- **Multi-Currency & Tax** — Per-invoice currency, per-line tax rates, inclusive/exclusive pricing, flexible rounding
- **Internationalization** — Multi-language UI, locale-aware date/number/address formatting
- **Themes** — Light and dark themes via daisyUI
- **Demo Mode** — Read-only demo with automatic database resets

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | SvelteKit 2, Vite 8, Tailwind CSS 4, daisyUI 5 |
| Frontend runtime | Bun |
| Backend | Deno 2 + Hono 4 |
| Database | SQLite 3 (via Deno) |
| PDF generation | WeasyPrint |
| Auth | JWT + TOTP |
| Packaging | Docker + Supervisord |

---

## Architecture

```
Browser
  └── SvelteKit (SSR, port 8000)
        └── /api/[...path] proxy (injects Authorization header)
              └── Hono API (port 3000, /api/v1/*)
                    ├── /auth/*         — Login, OIDC, 2FA
                    ├── /admin/*        — Protected CRUD (JWT required)
                    └── /public/*       — Share-token invoice access
                          └── SQLite (/app/data/app.db)
```

All processes run in a single container managed by **Supervisord**.

---

## Quick Start (Docker Compose)

```yaml
# docker-compose.yml
services:
  invoiceraider:
    image: ghcr.io/gittimeraider/invoiceraider:latest
    ports:
      - "8000:8000"
    volumes:
      - invoiceraider_data:/app/data
    environment:
      JWT_SECRET: change-me-to-a-long-random-string
      ADMIN_USER: admin
      ADMIN_PASS: changeme

volumes:
  invoiceraider_data:
```

```bash
docker compose up -d
```

Then open [http://localhost:8000](http://localhost:8000) and log in with your configured admin credentials.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | Yes | — | Secret key for signing JWTs |
| `ADMIN_USER` | Yes | — | Initial admin username |
| `ADMIN_PASS` | Yes | — | Initial admin password |
| `BACKEND_PORT` / `PORT` | No | `3000` | Internal backend port |
| `SESSION_TTL_SECONDS` | No | `3600` | JWT session lifetime (300–43200 s) |
| `DEMO_MODE` | No | `false` | Enable read-only demo mode |
| `DEMO_RESET_HOURS` | No | `3` | Auto-reset demo database every N hours |
| `DEMO_RESET_ON_START` | No | `true` | Reset demo database on container start |
| `SECURE_HEADERS_DISABLED` | No | `false` | Disable security headers (not recommended) |
| `ENABLE_HSTS` | No | `false` | Send HSTS header (enable when behind HTTPS) |
| `CONTENT_SECURITY_POLICY` | No | built-in | Override the default CSP header |

---

## Local Development

### Prerequisites

- [Deno](https://deno.land/) ≥ 2.6
- [Bun](https://bun.sh/) ≥ 1.x

### Backend

```bash
cd backend
deno task dev       # Watch mode
# or
deno task start     # Single run
```

### Frontend

```bash
cd frontend
bun install
bun run dev         # Dev server on http://localhost:5173
```

### Other frontend commands

```bash
bun run build       # Production build
bun run check       # Type check (svelte-kit sync + svelte-check)
bun run lint        # Prettier + ESLint
```

### Dev with Docker Compose

```bash
docker compose -f docker-compose-dev.yml up -d
```

This builds images from source instead of pulling pre-built ones.

---

## Data Persistence

All application data is stored under `/app/data/` inside the container:

| Path | Contents |
|---|---|
| `/app/data/app.db` | SQLite database |
| `/app/data/logos/` | Company logo uploads |
| `/app/data/templates/` | Custom invoice templates |
| `/app/data/backups/` | Automatic DB backups on schema upgrade |

Mount a named volume at `/app/data` to persist data across container restarts.

---

## Permissions Model

Access to API resources is controlled by a resource × action matrix enforced via the `requirePermission(resource, action)` middleware.

| Resource | Actions |
|---|---|
| `invoices` | read, create, update, delete, publish, void, export |
| `customers` | read, create, update, delete |
| `products` | read, create, update, delete |
| `templates` | read, create, update, delete, install |
| `settings` | read, update |
| `tax_definitions` | read, create, update, delete |
| `users` | read, create, update, delete |

---

## Invoice Number Patterns

Invoice numbers can be customized in Settings using token placeholders:

| Token | Description |
|---|---|
| `{YYYY}` | Full year (e.g. 2025) |
| `{MM}` | Two-digit month |
| `{DD}` | Two-digit day |
| `{RAND4}` | 4-character random alphanumeric |

Example: `INV-{YYYY}-{MM}-{RAND4}` → `INV-2025-06-A3F9`

---

## Export Formats

| Format | Standard | Use Case |
|---|---|---|
| PDF | — | Universal; uses WeasyPrint for rendering |
| UBL 2.1 | OASIS | General B2B electronic invoicing |
| Factur-X / ZugFeRD | EN 16931 | German/French hybrid PDF+XML |
| FatturaPA | Italian SDI | Italian electronic invoicing |
| PEPPOL BIS 3.0 | OpenPEPPOL | Pan-European procurement network |

---

## License

This software is released into the **public domain** under the [Unlicense](LICENSE). You are free to use, copy, modify, and distribute it for any purpose without restriction.

---

## Contributing

Contributions are welcome. Please follow the existing code style:

- Backend: `deno fmt` and `deno lint`
- Frontend: `bun run lint` (Prettier + ESLint)

Translations live in `frontend/src/lib/i18n/locales/`. Run `bun run sync-keys` after adding new translation keys.
