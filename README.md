# Nicoleen Debut – Invitation + RSVP (Tangled Theme)

A simple, elegant web invitation with RSVP and an admin panel. No external dependencies required; ships with a tiny Node.js server that stores RSVP entries to `data/rsvps.json` and serves a static front‑end.

## Features

- Guest pages: Home, RSVP, Program, Venue map, 18 Roses/Candles/Treasures
- Admin panel (password): view RSVPs, live yes count, export CSV, edit Program
- Mobile responsive, Tangled-inspired purple/gold design
- Zero package installs; easy to run anywhere Node.js is available

## Quick Start

- Requirements: Node.js 16+
- Run:
  ```bash
  # optional: set admin password (default: niky18)
  export ADMIN_PASSWORD="change-me"
  export PORT=3000
  node server.js
  ```
- Open: http://localhost:3000
- Admin: http://localhost:3000/admin.html (enter your admin password)

## Project Structure

- `public/` – static front‑end (SPA)
  - `index.html`, `app.js`, `styles.css`
  - `admin.html`, `admin.js`
- `data/` – JSON storage and editable content
  - `rsvps.json` – RSVP submissions
  - `program.json` – program timeline (admin‑editable)
  - `participants.json` – 18 Roses/Candles/Treasures lists
- `server.js` – minimal HTTP server + JSON API

## Configuration

- `ADMIN_PASSWORD` env var controls admin access (default: `niky18`).
- `PORT` env var sets the HTTP port (default: `3000`).

## Editing Content

- Program: Use the Admin panel Program Editor or edit `data/program.json`.
- 18s Lists: Edit `data/participants.json` (each array contains `{ name, role?, message? }`).
- Venue: Update address in `renderVenue()` inside `public/app.js`.
- Date/Time: Update text in `renderHome()` inside `public/app.js`.
\n+### Admin-Editable Content
- Site Settings: Admin panel → Site Settings (or `data/settings.json`) to change title, subtitle, date, time, and venue/map.
- Participants: Admin panel → Participants Editor (or `data/participants.json`).

## Deploy Options

Option A: Static site on GitHub Pages (simplest)

- Use the `docs/` folder (already included) as your GitHub Pages source.
- RSVP is handled by Google Forms (configure the form URL in `docs/data/settings.json`).
- Program, 18s lists, and site settings are editable JSON files in `docs/data/` via the GitHub UI.
- Admin views RSVPs in Google Sheets and can export CSV there.

Steps:
1. Create a Google Form with fields Name (Required), Email (Optional), Will attend? (Yes/No).
2. In Google Form settings, set the confirmation action to redirect to your site’s `thankyou.html` (optional but nice): `https://<username>.github.io/<repo>/thankyou.html`
3. Copy the form “live form” URL and paste it into `rsvpFormUrl` in `docs/data/settings.json`.
4. Optional: add the linked Google Sheet URL to `adminSheetUrl`.
5. Push to GitHub → Settings → Pages → Build and deployment → Source: Deploy from branch → Folder: `/docs`.
6. Visit your Pages URL and verify.

### Google Forms/Sheets Templates

- CSVs:
  - `templates/form_responses_template.csv` — header-only CSV for the linked Form sheet (columns: Timestamp, Name, Email, Will attend?)
  - `templates/sample_form_responses.csv` — sample data for testing formulas and views
- Apps Script Dashboard:
  - `templates/google_sheets_dashboard.gs` — creates a "Dashboard" sheet with live counts, attending lists, and a latest responses table

How to use the Dashboard script:
1) Open your linked Google Sheet (the one created by the Form). It has a tab named `Form Responses 1`.
2) Extensions → Apps Script → paste the contents of `templates/google_sheets_dashboard.gs`.
3) Save, then Run `initDashboard` once and authorize. A `Dashboard` tab will be created with formulas.
4) Optional: Customize headings or add charts to the Dashboard.

Option B: Node server on a host (Render, Railway, Fly.io, VPS)

For Netlify/Vercel serverless:
- Move API endpoints in `server.js` into functions (`netlify/functions` or `api/` for Vercel) and keep `public/` as the static site. The front‑end fetch URLs stay the same if you proxy `/api/*` to your functions.
- Alternatively deploy this as a Node server on Render/Railway and point your domain.

### Deploy to Render (recommended)

1) Push this repo to a GitHub repository (public or private).

2) Create a new Web Service on Render:
- Choose “+ New > Web Service”
- Select your GitHub repo
- Render will read `render.yaml` and create a Docker-based service
- Set environment variable `ADMIN_PASSWORD` to your desired admin password
- Keep `PORT=10000` (already configured)
- Click “Create Web Service”

3) After deploy completes, visit your Render URL:
- Guest site: `https://<your-service>.onrender.com`
- Admin: `https://<your-service>.onrender.com/admin.html`

Notes:
- The built-in JSON storage (`data/*.json`) is ephemeral on most hosts and may reset on redeploy. For durable storage, consider mounting a persistent disk (Render supports Disks) or migrate to a database (SQLite/Postgres).

## Security Notes

- For GitHub Pages, there is no server and no password in the site. Admin functions occur in Google Sheets and GitHub.
- For the Node option, admin password is checked via the `X-Admin-Key` header. Change the default password before deploying. Consider persistent storage.

### Environment Variables
- `ADMIN_PASSWORD` (required in production): admin panel password.
- `PORT` (Render sets `10000` by default in `render.yaml`).

## CSV Export

- Admin → “Export CSV” downloads `rsvps.csv` with Name, Email, WillAttend, Timestamp columns.

---
Enjoy the party planning! 🎉
