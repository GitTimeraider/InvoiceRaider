# InvoiceRaider

<p align="center" width="100%">
    <img width="33%" src="https://github.com/GitTimeraider/Assets/blob/main/InvoiceRaider/img/invoiceraider_icon.png">
</p>

Formerly a fork of https://github.com/kittendevv/Invio, however at this point enough features and functionality has been added and removed to make it its own project.
No changes made in the Invio project will be introduced in here.

### Disclaimers: 
#### AI is responsible for over half of the coding. Also keep in mind that this software is mostly developed for personal use by myself and thus might not receive all feature requests desired.
################################################################

A modern, self-hosted invoice management platform for freelancers and small to medium-sized businesses. Built with a SvelteKit frontend and a Deno/Hono backend, packaged as a single Docker container.

---

<details>
  <summary>📸 Click to show screenshots</summary>

  ![Dashboard](https://github.com/GitTimeraider/Assets/blob/main/InvoiceRaider/img/dashboard.png)
  ![Invoice](https://github.com/GitTimeraider/Assets/blob/main/InvoiceRaider/img/invoice.png)
  ![Customer](https://github.com/GitTimeraider/Assets/blob/main/InvoiceRaider/img/customer.png)
  ![Mail](https://github.com/GitTimeraider/Assets/blob/main/InvoiceRaider/img/mail.png)

</details>


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
- **Themes** — Light and dark themes via daisyUI

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
| `SECURE_HEADERS_DISABLED` | No | `false` | Disable security headers (not recommended) |
| `ENABLE_HSTS` | No | `false` | Send HSTS header (enable when behind HTTPS) |
| `CONTENT_SECURITY_POLICY` | No | built-in | Override the default CSP header |

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
