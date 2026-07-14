# Implementation plan — AI Assistant MVP

> **Agent-run technical contract:** exact commands are implementation evidence
> for Claude Code or Codex. The human supplies decisions and acceptance.

`STATUS: APPROVED (amended) — D-01 reopened and re-resolved 2026-07-14:
persistence moves from SQLite to Neon Postgres, per constitution v1.1.`

## Input contract

- Spec ID/version: AI-ASSISTANT-MVP v1.0 — [docs/spec.md](spec.md). Status: APPROVED.
- Constitution version: v1.1 — [docs/constitution.md](constitution.md). Status: APPROVED.
- Approval evidence: v1.0/spec approved by Tóth Tibor, 2026-07-14; v1.1
  amendment (persistence → Neon) approved the same day (see each document's
  Human spec gate / Constitution gate section).
- Acceptance criteria covered: AC-01…AC-07 — derived from `spec.md` §1–§7 and
  [docs/given-when-then.md](given-when-then.md), since `spec.md` itself has no
  formal AC table yet (see mapping in Smallest complete slice).
- Scope/file ownership (per `constitution.md` → Non-negotiable boundaries):
  `src/app/**`, `src/components/ui/**` (shadcn CLI only), `src/lib/**`,
  `docs/**`; persistence is Neon Postgres via `DATABASE_URL` — no local data
  file to gitignore anymore (path/schema decided in TASK-01/TTO-5).
- Canonical engineering standard: [docs/engineering-standard.md](engineering-standard.md).

## Current-state evidence

- Relevant entry points: default Next.js App Router starter — `src/app/page.tsx`,
  `src/app/layout.tsx`; `src/components/ui/button.tsx`, `card.tsx` (only two
  shadcn components installed so far); `src/lib/utils.ts`.
- Existing tests/contracts: `src/lib/utils.test.ts` (Vitest smoke test) — must
  stay green throughout.
- Constraints discovered: no database code, no API routes, and no
  `ANTHROPIC_API_KEY`/`.env.local` exist yet; a Neon Postgres client (e.g.
  `@neondatabase/serverless`) is not yet a dependency — adding it is the
  pre-agreed exception to the "no new dependency" rule (Neon chosen over
  SQLite and a JSON file — see Risks below). The Vercel project is already
  linked and deployed (production alias live); the Neon integration is
  provisioned through the Vercel Marketplace so `DATABASE_URL` arrives via
  `vercel env pull`, the same path as every other env var.
- Exact check commands confirmed: `npm run typecheck`, `npm run lint`,
  `npm run test`, `npm run build`, `npm run test:e2e` (Definition of Done,
  `engineering-standard.md` §6). Playwright is now wired (harness smoke test
  only — `e2e/smoke.spec.ts`); per-feature E2E scenarios are Linear TTO-12.
- Plan assumptions that require validation:
  - Neon's free/dev tier connection limits are sufficient for a single-user
    demo MVP (no auth, one demo user — per constitution); serverless driver
    (`@neondatabase/serverless` over HTTP, not a pooled TCP client) avoids
    Vercel Functions' connection-limit and cold-start pitfalls.
  - Claude model: RESOLVED — Claude Sonnet 5 (`claude-sonnet-5`) for both (a)
    chat responses and (b) title generation (D-03, see [tasks.md](tasks.md)).

## Smallest complete slice

| Step | Change and files/modules | Acceptance criteria | Agent-run verification | Owner |
|---|---|---|---|---|
| 1 | Neon Postgres schema + data module: `conversations`, `messages` tables — `src/lib/db.ts` (Linear TTO-5) | AC-04 | `npm run test -- db` | Tóth Tibor |
| 2 | Claude client (model: `claude-sonnet-5`, D-03) + chat endpoint, full-history request — `src/lib/claude.ts`, `src/app/api/conversations/[id]/messages/route.ts` (Linear TTO-6) | AC-02 | `npm run test -- messages` | Tóth Tibor |
| 3 | Chat UI: message list + Send — `src/app/page.tsx` + new components under `src/components/` (Linear TTO-7) | AC-01 | `npm run test -- chat` | Tóth Tibor |
| 4 | New Chat: `POST /api/conversations` + button — `src/app/api/conversations/route.ts` (Linear TTO-8) | AC-03 | `npm run test -- conversations` | Tóth Tibor |
| 5 | Sidebar: `GET /api/conversations` + list component — (Linear TTO-9) | AC-05 | `npm run test -- sidebar` | Tóth Tibor |
| 6 | Open past conversation: `GET /api/conversations/[id]` + UI wiring — (Linear TTO-10) | AC-06 | `npm run test -- conversations` | Tóth Tibor |
| 7 | Auto title: title-generation call (model: `claude-sonnet-5`, D-03) + fallback to "New Chat" — (Linear TTO-11) | AC-07 | `npm run test -- title` | Tóth Tibor |
| 8 | Per-feature E2E scenarios (SC-01, SC-04, SC-06, SC-07, SC-08A/B) in Playwright, replacing/extending the harness smoke test — (Linear TTO-12) | AC-01, AC-03, AC-05, AC-06, AC-07 | `npm run test:e2e` | Tóth Tibor |

## Architecture and data impact

- Boundary/dependency direction: `src/app/**` (routes/UI) → `src/app/api/**`
  (route handlers) → `src/lib/**` (db, Claude client); `src/lib/**` never
  imports from `src/app/**`.
- Stable contracts preserved: `src/lib/utils.ts` + its test untouched; existing
  shadcn `button.tsx`/`card.tsx` unchanged in shape (only reused).
- Schema/migration impact: first schema in the repo — `conversations` and
  `messages` tables, applied to Neon as a plain SQL migration (no ORM/
  migration framework — one schema file is enough for two tables; adding
  Prisma/Drizzle now would be premature abstraction per the engineering
  standard's simplicity rule); no prior schema to break.
- Authorization/privacy impact: none in scope — no auth (constitution
  non-goal); user-entered chat text is now stored in a remote Neon database
  rather than a local file — `DATABASE_URL` is a secret with the same
  handling as `ANTHROPIC_API_KEY` (never committed, per constitution).
- Compatibility/locale/time impact: timestamps ISO 8601 UTC (per constitution);
  no locale-specific formatting required by the spec.

## Risks, alternatives, and rollback

- Chosen approach and why: **Neon Postgres** via the Vercel Marketplace
  integration (D-01 reopened and re-resolved 2026-07-14). SQLite was the
  original choice for local-only simplicity, but the app is now actually
  deployed on Vercel (production alias live) — Vercel Functions are
  ephemeral/stateless between invocations, so a local SQLite file would not
  reliably survive across requests or deployments in that environment. A
  managed Postgres reachable over HTTP (`@neondatabase/serverless`) fits
  Vercel's serverless model; it did not fit the original "no hosting/DB
  integration yet" scope, which this amendment explicitly changes.
- Alternative rejected and why: SQLite (`better-sqlite3`) — rejected now that
  hosting is Vercel serverless, for the durability reason above; plain JSON
  file — rejected for the same durability reason, plus less robust for a
  growing message history.
- Risk / mitigation: Claude API failure mid-conversation → mitigated by SC-03
  (visible error, no corrupted state, user message stays saved). Title-
  generation latency/failure → mitigated by SC-08B (falls back to "New Chat",
  never blocks the chat flow).
- Safe rollback/reversal: each step only adds files/routes; reverting
  TASK-07 → TASK-01 in reverse order removes the feature without touching the
  pre-existing starter or its smoke test.
- Residual risk requiring human ownership: none remaining on branch
  protection — resolved 2026-07-14 by making the repo public and enabling
  branch protection on `main` (required `checks` status, PR-required,
  `enforce_admins: true`; see `engineering-standard.md` §6). The repo being
  public is itself an ongoing responsibility: no secrets or real personal
  data may ever land in the history (constitution.md → Public-repository
  hygiene already assumed this, now it is load-bearing, not precautionary).

## Plan gate and handoff

- [x] Spec and constitution versions are approved. — spec v1.0, constitution
      v1.1 (amended), Tóth Tibor, 2026-07-14.
- [x] Plan does not add product behavior. — the persistence swap is an
      architecture change inside the existing AC-04, not new behavior.
- [x] Scope and exclusive file ownership are agreed.
- [x] Every AC maps to a change and evidence.
- [x] Actual check commands are identified.
- [x] Reviewer roles are selected. — a separate, fresh-context Claude Code or
      Codex session performs the independent review (no shared context with
      the builder session).
- [x] Human approved the plan or recorded an owned exception. — Tóth Tibor,
      2026-07-14 (both the original P1 approval and this Neon amendment).
- [x] Every instructional placeholder is replaced, removed, or recorded as
      `N/A` with reason.

- Plan verdict: `APPROVED`
- Approved by/at: Tóth Tibor / 2026-07-14 (pontos időpont nem rögzítve)
- Plan version: `P2-APPROVED-PLAN` (amends `P1-APPROVED-PLAN`: persistence → Neon)
- Output plan version for [tasks.md](tasks.md): `P2`
