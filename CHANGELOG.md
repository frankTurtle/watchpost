# Changelog

All notable changes to this project are documented in this file. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-08-18

Initial release.

### Added

- Public status page with per-monitor uptime bars (48 half-hour buckets),
  overall status banner, and 60-second ISR revalidation.
- Admin dashboard: create, pause, and delete monitors; trigger on-demand
  check runs. Protected by HTTP Basic Auth when `ADMIN_PASSWORD` is set.
- Monitor REST API (`/api/monitors`, `/api/monitors/[id]`) with input
  validation.
- HTTP check engine shared in behavior with the AWS Lambda worker (10s
  timeout, redirect follow, error capture).
- Supabase Postgres schema with row-level security (anon read-only), plus a
  zero-config in-memory demo mode seeded with 24 hours of synthetic data.
- AI status summaries: FastAPI microservice calling the Anthropic API
  (Claude Opus 5) with graceful degradation when unconfigured.
- Terraform module provisioning the scheduled checker: Lambda (Node 22),
  EventBridge rule, IAM role, CloudWatch logs.
- Test suites with enforced coverage gates: Vitest (147 tests, ≥90% lines on
  server logic) and pytest (12 tests, ≥90% on the AI service).
- GitHub Actions CI: lint, tests with coverage gates, build, and Terraform
  fmt/validate.
