<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project Conventions

This section is for AI coding agents. It documents the stack, architecture, code style, and workflow for this project.

### Stack

- **Web framework** — Next.js 16 (App Router, TypeScript); Tailwind CSS v4, DaisyUI 5
- **Database** — Supabase Postgres (optional; demo mode runs in-memory)
- **Scheduled checks** — AWS Lambda + EventBridge (optional)
- **AI service** — FastAPI + Anthropic Claude API (optional)
- **Testing** — Vitest (web, 90% coverage gate on lib/ and api routes) + pytest (AI service, 90% coverage gate)
- **CI** — GitHub Actions: lint, build, test with coverage gates, terraform validate

### Directory Layout

```
app/                        # Next.js App Router pages and components
  admin/                    # Admin dashboard
  api/                      # API routes
    monitors/               # GET/POST/PUT/DELETE monitors
    checks/                 # Trigger manual checks
    ai/summary/             # Request AI summary from FastAPI
  components/               # React components (status page, dashboard)
  page.tsx                  # Public status page
  layout.tsx                # Root layout
  favicon.ico, globals.css  # Styling

lib/                        # Pure TypeScript functions (testable, reusable)
  data/                     # Data providers (Supabase or demo)
    index.ts                # getDataProvider() selects demo or Supabase based on env vars
    provider.ts             # DataProvider interface
    demo.ts                 # In-memory demo data (3 seeded monitors, 24h checks)
    supabase.ts             # Supabase client and queries
  status.ts                 # Status calculation logic
    summarizeMonitor()      # 48-bucket 24h uptime bars, up/down/degraded status
    overallStatus()         # Operational / degraded / outage / unknown
  types.ts                  # TypeScript interfaces

supabase/                   # Database schema and seed data
  migrations/0001_init.sql  # Tables: monitors, checks (with RLS policies)
  seed.sql                  # Example data

infra/                      # AWS Lambda checker infrastructure
  terraform/                # Terraform configs (Lambda, EventBridge, CloudWatch)
  lambda/index.mjs          # Lambda function: fetch monitors, check URLs, record results

services/ai/                # FastAPI microservice for status summaries
  app/
    main.py                 # FastAPI app, CORS config, /health and /summarize endpoints
    claude.py               # Claude Opus 5 integration with server-side fallback
    schemas.py              # Pydantic models (SummarizeRequest, SummarizeResponse)
  tests/                    # pytest test suite (90% coverage enforced)

.github/workflows/ci.yml    # GitHub Actions: lint, build, test, terraform validate
```

### Demo Mode

When Supabase credentials are unset in `.env.local`, the app runs in demo mode:

- `lib/data/index.ts` calls `createDemoProvider()` instead of `createSupabaseProvider()`
- In-memory database with 3 monitors (Example.com, GitHub, flaky demo service)
- Each monitor has 24 hours of synthetic check data (checks every 5–30 minutes)
- 48 half-hour uptime buckets calculated per `lib/status.ts`
- Monitors, checks, and AI summaries all work exactly as with Supabase—only the storage layer differs

Demo mode is zero-configuration: `npm run dev` and go.

### Server Logic

**All business logic lives in `lib/` as pure functions.** This includes:

- Status calculation (`summarizeMonitor`, `overallStatus`)
- Data access patterns (provider interface)
- Type definitions

This keeps logic testable, reusable across API routes, and independent of framework specifics.

### Coverage Gates

- **Web app (Vitest)** — `npm run test:coverage` enforces 90% line coverage on `lib/` and `app/api/`
  - `v8` coverage reporter
  - Misses count as test failures; PR cannot merge without threshold met
- **AI service (pytest)** — `cd services/ai && python -m pytest` enforces 90% on `app/`
  - `pytest-cov` with `--cov-fail-under=90`
  - Same enforcement in CI

CI runs both gates on every PR (see `.github/workflows/ci.yml`).

### Commits and Branches

- **Branch model** — GitFlow: `feature/*` off `develop`, release branches off `main`
- **Conventional commits** — Type + scope: `feat(admin): add password`, `fix(status): uptime calculation`, `docs(readme): quickstart`
- **Co-author trailer** — Every commit: `Co-Authored-By: Claude <noreply@anthropic.com>`
- **CI gates** — All PRs must pass: lint, build, test (coverage), terraform validate

### Before Pushing

Run locally:
```bash
npm run lint       # ESLint on TypeScript
npm run test:coverage
npm run build
cd services/ai && python -m pytest  # If services/ai changed
cd infra/terraform && terraform validate  # If infra changed
```

If any fail, the PR will not merge; fix locally, commit, and push again.

### Code Style

**TypeScript:**
- Strict mode always; no `any` types
- Describe why in comments, not what (the code shows what)
- Keep components small; extract logic to `lib/`
- Async/await preferred over `.then()`

**Python:**
- Type hints on all functions
- Docstrings for public functions and classes
- Follow Black/isort conventions
- Tests alongside new code

Both languages: descriptive names, short functions, no abbreviations unless the term is standard in the codebase.

