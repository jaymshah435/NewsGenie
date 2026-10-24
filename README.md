# NewsGenie

A customer portal for news publishers that use three SaaS products, with an AI assistant that answers questions from the product data and can change a setting after the user approves.

| Product | What it tracks |
|---|---|
| Content Analytics | Articles processed, quality scores, processing time |
| Community Moderation | Comments reviewed, flagged, removed, approved after review |
| Content Protection | Automated content-access requests, suspicious and blocked requests |

**Tech stack:** React + Vite + React Router + TypeScript + Tailwind + Recharts (frontend), Node.js + Express + TypeScript + SQLite built into Node.js (backend), Anthropic Claude (AI assistant), Vitest, Testing Library and Supertest (tests). One language, TypeScript, across the whole project.

See [ARCHITECTURE.md](ARCHITECTURE.md) for how it works, including how the AI agent uses the APIs.

---

## Setup

You need **Node.js 22.13 or newer** (the current LTS release is recommended) and an **Anthropic API key**. The dashboards work without the key; the assistant needs it.

### 1. Install

From the project folder:

```bash
npm install
```

This installs both the backend and the frontend.

### 2. Add your API key

Copy the example settings file, then paste your key after `ANTHROPIC_API_KEY=`.

```powershell
Copy-Item backend/.env.example backend/.env    # Windows (PowerShell)
notepad backend/.env
```

```bash
cp backend/.env.example backend/.env           # macOS / Linux
```

### 3. Start

```bash
npm run dev
```

This starts the API on **http://localhost:8000** and the web app on **http://localhost:5173**. Open **http://localhost:5173**.

The database (`backend/newsgenie.db`) is created and filled automatically the first time the backend starts, from the sample data file `backend/data/sample-data.json`.

To run the two parts in separate terminals instead, use `npm run dev -w backend` and `npm run dev -w frontend`.

---

## Demo accounts

Every account uses the password **`Demo1234!`**. You can also click an account on the login page to fill it in.

| Email | Organization | Role |
|---|---|---|
| alice@dailyplanet.com | The Daily Planet | Admin |
| bob@dailyplanet.com | The Daily Planet | Standard user |
| carol@metrotimes.com | Metro Times | Admin |
| dan@metrotimes.com | Metro Times | Standard user |
| erin@newsgroup.com | The Daily Planet and Metro Times | Standard user |

**Permissions**
- Every user sees only the organizations they belong to.
- Only admins can change settings (the moderation alert threshold), and only for their own organization.

---

## Using the app

| Page | What you can do |
|---|---|
| **Dashboard** | See all three products at once: totals, the % change vs the previous period of the same length, and a daily trend. Filter by period (last 7, 30 or 90 days) or exact dates and, for Erin, by organization. Click a card to open that product. |
| **Content Analytics** | Summary numbers (articles processed, average quality score, average processing time), articles per day and quality score per day. Filter by date and, for Erin, by organization. |
| **Community Moderation** | Summary numbers (comments reviewed, flagged, removed, approved after review), comments reviewed per day, flagged comments and outcomes per day, and the current alert threshold. Filter by date and, for Erin, by organization. |
| **Content Protection** | Summary numbers (automated, suspicious and blocked requests) and requests per day. Filter by date and, for Erin, by organization. |
| *(All product pages)* | Every summary number shows the % change vs the previous period of the same length, e.g. "▲ +12.3% vs previous period". |
| **AI Assistant** | Ask questions in plain English, or click one of the example questions. |
| **Log out** | Bottom of the sidebar. |

### A short demo

1. Log in as **Alice** and look at the Dashboard, then open each product.
2. In the **AI Assistant**, click the example questions:
   - "Summarize activity across my three products over the last seven days."
   - "Which product experienced the greatest increase in activity?"
   - "Show me moderation trends for this month."
   - "Change the moderation alert threshold to 75 after I approve."
3. For the last one, an **Approval needed** card appears. Nothing changes until you click **Approve**. Then open Community Moderation: the threshold now shows 75. Clicking **Cancel** instead leaves it unchanged.
4. Log out and log in as **Bob** (standard user). Ask the assistant to change the threshold: it refuses, because only admins can change settings.
5. Log in as **Erin** and use the **Organization** filter on the Dashboard to switch between both organizations.

### The sample data

All demo data lives in one file: **`backend/data/sample-data.json`**. It holds the 2 organizations, the 5 users and 90 days of daily numbers per organization and product (**26 July to 23 October 2026**). Nothing is generated at runtime, so every computer shows exactly the same numbers. Date filters and the assistant treat the last day in the file as "today".

You can open the file and edit it (one record per line), then run `npm run reset-db` to load your changes. If something in the file is wrong, the backend stops with a message naming the exact field.

Built-in trends:

- The Daily Planet: automated (bot) requests rise sharply over the last 10 days; a spike in comments about two weeks ago.
- Metro Times: the share of flagged comments climbs over the last three weeks.

### Resetting the data

Stop the app, then run:

```bash
npm run reset-db
```

This deletes everything (including threshold changes and pending assistant actions) and reloads `backend/data/sample-data.json`.

---

## Tests and checks

```bash
npm test             # backend and frontend tests
npm run lint         # ESLint (frontend)
npm run typecheck    # TypeScript (backend and frontend)
```

**Backend (17 tests):** login, wrong password, requests without a token; a user cannot read another organization's data (all three products); the organization filter; the date filter, and a start date after the end date; standard users cannot change settings; admins can change only their own organization; the assistant's tools cannot read another organization; a change happens only after approval; cancel and double-approve; a user cannot approve someone else's change; a clear message when no API key is set; the database matches the sample data file.

**Frontend (9 tests):** login error message, organization filter shows only the user's organizations, the period picker, Approve button, loading and error states, and the % change line on stat cards.

The assistant tests call the assistant's tools directly, so they run without an API key. The running app always uses the real Claude API.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Cannot reach the server" | The backend isn't running on port 8000. Check the `[api]` lines in the terminal. |
| Assistant says it is not set up | Add `ANTHROPIC_API_KEY` to `backend/.env` and restart. |
| "Model … was not found" | Set `ANTHROPIC_MODEL` in `backend/.env` to a model your key can use. |
| An error mentions `node:sqlite` | The database uses the SQLite built into Node.js. Use Node.js 22.13 or newer (`node --version`). |
| Port 8000 or 5173 is already in use | Stop the other program, or set `PORT` in `backend/.env` (then set `VITE_API_URL` in `frontend/.env` to match). |
