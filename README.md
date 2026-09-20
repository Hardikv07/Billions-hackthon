# NIRMAN 360 — From tender to timely delivery

A government infrastructure delivery intelligence platform. It turns a tender document into a
living project workflow, then answers the question a pending-approvals list never can:

> **Which pending government action can stop work on the ground, and what does a further delay cost?**

MERN stack only — React + Vite + TypeScript + Tailwind on the front, Node + Express + TypeScript +
MongoDB (Mongoose) + JWT on the back.

---

## Run it

```bash
# 1. MongoDB must be running locally (or set MONGO_URI in server/.env)
cp server/.env.example server/.env

# 2. Install everything
npm run install:all

# 3. Seed the demo state
npm run seed

# 4. Start both processes
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:5050
### Default login credentials

These demo accounts are created by `npm run seed` and already exist in the hosted database.

| Role | Name | Email | Password |
|---|---|---|---|
| Senior officer *(start here — sees the full demo narrative)* | A. Mehra | `officer@nirman.demo` | `demo123` |
| Platform administrator | R. Iyer | `admin@nirman.demo` | `demo123` |
| Project manager | S. Deshmukh | `pm@nirman.demo` | `demo123` |

The sign-in page pre-fills the officer account. These are shared demo credentials for evaluation
only — change or remove them before using the platform with real data.

Live API: https://billions-hackthon.onrender.com (`/api/health` reports status; the free plan
sleeps when idle, so the first request after a pause can take up to a minute).

### Optional: live model extraction

Set `GEMINI_API_KEY` in `server/.env` to extract uploaded tenders with a language model.
Without it, `aiService.extractTender()` falls back to `demoExtraction()` — a deterministic,
keyword-driven layer — so the demo never breaks on a missing credential. `GET /api/health`
reports which mode is active, and the tender detail screen labels it.

---

## The demo narrative

Everything is seeded relative to *now*, so the scenario is always live whenever you run it.

1. **Overview** — Railway NOC, SLA breached by 1.4 days, execution window at risk.
2. **Investigate** → approval detail: overdue counter, React Flow dependency path,
   impact radius of **6 activities · 2 milestones · 1 execution window**.
3. **Execution windows** → the Sunday 02:00–04:00 railway traffic block, 80% ready,
   one missing prerequisite.
4. **Simulate delay** → what-if at +1/+3/+7/+14 days: window lost, next window +7 days,
   completion shift, and a plain-language finding.
5. **Escalate** → the intervention register with a full event timeline.
6. **Reports** → the evidence-backed delay dossier, plus project memory
   ("Why was the railway approval delayed?").

Press **⌘K / Ctrl+K** anywhere for the command palette.

---

## Layout

```
server/src
  config/      env + mongoose connection
  models/      10 Mongoose models
  services/    ALL business logic lives here
               slaService        pure SLA maths (no DB — trivially testable)
               impactService     downstream dependency-graph traversal
               windowService     readiness, recurrence, next occurrence
               simulationService non-mutating what-if forward simulation
               aiService         model call + deterministic fallback
               dossierService    assembles the delay dossier
  controllers/ thin — parse, delegate, respond
  routes/      one router, JWT-guarded
  seed/        the full demo state

client/src
  layouts/AppShell.tsx   quiet sidebar (sheet on phones), search, notifications, appearance
  components/ui.tsx      the design system: Button, Field/Select/SearchField, Segmented, Badge,
                         Stat, Section, ProgressBar, Skeleton, EmptyState/ErrorState, Alert,
                         Modal/ConfirmDialog, Drawer, Popover, Tooltip, toasts
  components/            DataTable (stacks on phones), Timeline, Countdown, ImpactGraph,
                         ExecutionWindowCard, CommandPalette
  hooks/useTheme.tsx     light / dark / system
  pages/                 11 screens

## Design system

Tokens live in `client/src/index.css` (colour, light + dark) and `client/tailwind.config.js`
(type scale, radii). One neutral palette and one accent; `ok` / `warn` / `bad` appear only when
they carry meaning, and never alone — every status also has a text label. Motion respects
`prefers-reduced-motion`, and dossiers print on white regardless of theme.
```

## Notes on language

The interface never attributes fault to an officer or a department. It says
*SLA breached*, *action overdue*, *project impact detected*, *intervention recommended*.
Tender matching is called **suitability match** and always shows why it scored that way —
it scores your declared capacity, not the quality of the tender.
