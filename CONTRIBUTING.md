# Contributing to Watchpost

Thanks for your interest in contributing. This guide covers setup, the development workflow, and code style.

## Development Setup

### Web app (Next.js + TypeScript)

```bash
npm install
npm run dev
```

Runs on [http://localhost:3000](http://localhost:3000) with hot reload.

### AI service (FastAPI + Python)

```bash
cd services/ai
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -e ".[dev]"
export ANTHROPIC_API_KEY=sk-...  # Optional; only needed to test AI features
.venv/bin/uvicorn app.main:app --port 8000
```

### Connect to Supabase

To test against live data instead of demo mode, copy `.env.example` to `.env.local` and add your Supabase credentials. See README.md for details.

## Branching Model

Watchpost uses GitFlow:

- **Feature branches** — branch off `develop` with a descriptive name (e.g., `feature/admin-password`, `fix/uptime-calculation`)
- **Pull requests** — merge feature branches back into `develop` via PR; all CI checks must pass
- **Releases** — when `develop` is stable, cut a `release/*` branch, then merge to both `main` and back to `develop`

## Commits

Use conventional commit format:

```
<type>(<scope>): <subject>

<optional body>

<optional footer>
Co-Authored-By: Your Name <your.email@example.com>
```

**Types:**
- `feat` — new feature
- `fix` — bug fix
- `docs` — documentation (README, guides, comments)
- `test` — test additions or changes
- `ci` — CI/CD changes (workflows, terraform)
- `chore` — build, dependencies, tooling (no code logic change)

**Example:**
```
feat(admin): add password protection

When ADMIN_PASSWORD is set, require basic auth on /admin
and all write APIs (POST, PUT, DELETE).

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Before Pushing

All of the following must pass locally before submitting a PR:

```bash
npm run lint
npm run test:coverage
npm run build
```

If you modified the AI service:
```bash
cd services/ai
python -m pytest
```

If you modified infrastructure (Terraform):
```bash
cd infra/terraform
terraform fmt -recursive
terraform validate
```

CI will run these same checks; a green build is your confirmation that the PR is ready to merge.

## Code Style

### TypeScript

- **Strict mode** — `"strict": true` in `tsconfig.json`; no `any` types
- **Components** — keep them small and focused; extract reusable logic to `lib/`
- **Server logic** — pure functions in `lib/` (status calculation, data providers) so it stays testable and reusable
- **Naming** — descriptive names; prefer `isMonitorDown` over `status`

### Python

- **Type hints** — all functions and public methods
- **Docstrings** — for modules, classes, and public functions
- **Testing** — new logic should have accompanying tests; aim for 90%+ coverage
- **Style** — follows Black and isort conventions via pytest and pre-commit

### General

- **Comments** — explain *why*, not *what*; the code shows what it does
- **Tests** — add tests alongside new features, not after
- **Docs** — keep README.md and inline comments in sync with code changes

## Questions?

Open an issue or a draft PR; we're happy to help.
