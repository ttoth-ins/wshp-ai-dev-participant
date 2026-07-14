# Task breakdown — AI Assistant MVP

> **Agent-run technical contract:** Claude Code or Codex executes every exact
> check and records the evidence. The human approves scope, findings, and
> progression.

`STATUS: APPROVED (amended) — constitution v1.1, spec, and plan P2 all carry a
recorded human approval (Tóth Tibor, 2026-07-14), including the D-01
amendment (persistence: SQLite → Neon Postgres). Every task below is still
not-started and every coverage verdict is pending, not covered — approval
opens the gate to implementation, it does not mean implementation happened.`

## Input versions

- Constitution: v1.1 (APPROVED, amended) — [constitution.md](constitution.md)
- Spec: AI-ASSISTANT-MVP v1.0 (APPROVED) — [spec.md](spec.md)
- Plan: `P2-APPROVED-PLAN` (verdict `APPROVED`, amends `P1`) — [plan.md](plan.md)
- Human approval evidence: Tóth Tibor, 2026-07-14, recorded in each
  document's gate section.

## Ordered tasks

The accountable owner column names the human acceptance gate. Claude Code or
Codex is the technical executor for implementation, checks, and fixes. Each
task also has a matching Linear issue in the **AI Assistant MVP** project
(`Ttoth` team) — the issue is the day-to-day work surface, this table is the
spec-package's authoritative cross-reference to it.

| ID | Task/outcome | Exclusive scope | Accountable owner | Depends on/order | AC IDs | Agent-run verification | Evidence location | Status |
|---|---|---|---|---|---|---|---|---|
| TASK-01 | Neon Postgres schema + data module: create/list/get conversation, save message | `src/lib/db.ts` + its test | Tóth Tibor | — (first) | AC-04 | `npm run test -- db` | Linear TTO-5 comment | not-started |
| TASK-02 | Claude client + chat endpoint: save user message, load full history, call Claude, save + return AI response | `src/lib/claude.ts`, `src/app/api/conversations/[id]/messages/route.ts` + tests | Tóth Tibor | after TASK-01 | AC-02 | `npm run test -- messages` | Linear TTO-6 comment | not-started |
| TASK-03 | Chat UI: message list, input, Send button, loading state | `src/app/page.tsx` + new chat components under `src/components/` | Tóth Tibor | after TASK-02 | AC-01 | `npm run test -- chat` | Linear TTO-7 comment | not-started |
| TASK-04 | New Chat: `POST /api/conversations` + button, activates the new empty conversation | `src/app/api/conversations/route.ts`, UI button wiring | Tóth Tibor | after TASK-01, TASK-03 | AC-03 | `npm run test -- conversations` | Linear TTO-8 comment | not-started |
| TASK-05 | Sidebar: `GET /api/conversations` + list component, auto-refresh on creation | `src/app/api/conversations/route.ts` (GET), sidebar component | Tóth Tibor | after TASK-01, TASK-03 | AC-05 | `npm run test -- sidebar` | Linear TTO-9 comment | not-started |
| TASK-06 | Open past conversation: `GET /api/conversations/[id]` + click-to-open wiring | `src/app/api/conversations/[id]/route.ts`, UI wiring | Tóth Tibor | after TASK-05 | AC-06 | `npm run test -- conversations` | Linear TTO-10 comment | not-started |
| TASK-07 | Auto title: Claude-generated title (model `claude-sonnet-5`, D-03) on first message, fallback to "New Chat" on failure | title-generation call + DB update, wherever TASK-02 saves the first message | Tóth Tibor | after TASK-02, TASK-05 | AC-07 | `npm run test -- title` | Linear TTO-11 comment | not-started |
| TASK-08 | Per-feature Playwright scenarios (SC-01, SC-04, SC-06, SC-07, SC-08A/B), replacing/extending the harness smoke test | `e2e/**` | Tóth Tibor | after TASK-03, TASK-05, TASK-06, TASK-07 | AC-01, AC-03, AC-05, AC-06, AC-07 | `npm run test:e2e` | Linear TTO-12 comment | not-started |

## Per-task execution contract

Before editing, the builder:

1. restates the linked ACs and scope;
2. reads repository instructions and canonical standards (`AGENTS.md`,
   `docs/engineering-standard.md`);
3. reports `DECISION REQUIRED` rather than inventing behavior;
4. runs the named checks and records command, exit code, and relevant output
   as a Linear issue comment;
5. hands the artifact and evidence to an independent fresh-context review —
   a separate Claude Code or Codex session with no prior context on the
   change (see RUG execution below).

A task is done only when its ACs pass, accepted findings are fixed and
re-verified, and remaining risk has a human owner.

## Acceptance coverage matrix

| AC ID | Scenario(s) | Owned task(s) | Dependencies/order | Agent-run check | Evidence location | Verdict |
|---|---|---|---|---|---|---|
| AC-01 | SC-01 | TASK-03, TASK-08 | TASK-01 → TASK-02 → TASK-03 → TASK-08 | `npm run test -- chat` + `npm run test:e2e` | Linear TTO-7 / TTO-12 comment | pending |
| AC-02 | SC-02, SC-03 | TASK-02 | TASK-01 → TASK-02 | `npm run test -- messages` | Linear TTO-6 comment | pending |
| AC-03 | SC-04 | TASK-04, TASK-08 | TASK-01, TASK-03 → TASK-04 → TASK-08 | `npm run test -- conversations` + `npm run test:e2e` | Linear TTO-8 / TTO-12 comment | pending |
| AC-04 | SC-05 | TASK-01 | — (first) | `npm run test -- db` | Linear TTO-5 comment | pending |
| AC-05 | SC-06 | TASK-05, TASK-08 | TASK-01, TASK-03 → TASK-05 → TASK-08 | `npm run test -- sidebar` + `npm run test:e2e` | Linear TTO-9 / TTO-12 comment | pending |
| AC-06 | SC-07 | TASK-06, TASK-08 | TASK-05 → TASK-06 → TASK-08 | `npm run test -- conversations` + `npm run test:e2e` | Linear TTO-10 / TTO-12 comment | pending |
| AC-07 | SC-08A, SC-08B | TASK-07, TASK-08 | TASK-02, TASK-05 → TASK-07 → TASK-08 | `npm run test -- title` + `npm run test:e2e` | Linear TTO-11 / TTO-12 comment | pending |

## RUG execution and closed-gate handoff

- Builder restatement task: the first action inside each Linear issue — the
  builder agent restates the linked ACs and exclusive scope before touching a
  file.
- Independent fresh-context reviewer task: a separate Claude Code or Codex
  session, with no prior context on the change, reviews each task's diff
  against this file and `given-when-then.md` before it counts as done.
- Accepted-finding bounce-back owner/task: the builder agent performs the
  technical fix and records a new evidence comment; Tóth Tibor verifies the
  evidence and owns the acceptance gate.
- Re-verification command and evidence location: `npm run typecheck && npm run
  lint && npm run test && npm run build && npm run test:e2e` — recorded as a
  Linear issue comment.
- Closed-spec-gate packet location: this five-file package
  (`constitution.md`, `spec.md`, `given-when-then.md`, `plan.md`, `tasks.md`)
  plus Linear TTO-5…TTO-12.
- Statement that feature implementation has not started: true as of this
  writing — every Linear issue (TTO-5…TTO-12) is in `Backlog` status.

- [x] Every AC appears in the coverage matrix.
- [x] Every task has exactly one accountable owner and exclusive scope.
- [x] Dependencies and execution order are explicit, including review and
      bounce-back (reviewer role: separate Claude Code/Codex session).
- [x] Every check is an executable command, not a generic test label.
- [x] Every evidence location is named before work starts.
- [x] No unresolved decision remains silently invented; D-03 is RESOLVED
      (Claude Sonnet 5) and recorded below, not assumed.
- [x] Approved constitution, spec, and plan versions are recorded. — v1.1 /
      v1.0 / P2-APPROVED-PLAN, Tóth Tibor, 2026-07-14.
- [x] A human has approved entry into the implementation phase. — Tóth Tibor,
      2026-07-14 (plan approval, see `plan.md`).

## Decision and deviation log

| Decision/deviation | Owner | Options/impact or reason | Outcome | Evidence |
|---|---|---|---|---|
| D-01 persistence choice | Tóth Tibor | SQLite (`better-sqlite3`) vs. JSON file vs. Neon Postgres | REOPENED 2026-07-14, RE-RESOLVED — **Neon Postgres**, via Vercel Marketplace integration. Reason: the app is now deployed on Vercel (serverless Functions), where a local SQLite file isn't durable storage across invocations/deployments; Neon (`@neondatabase/serverless`) fits that model. Originally SQLite (first resolution, superseded) | conversation record; [plan.md](plan.md) Risks; constitution v1.1 |
| D-02 auto-title generator | Tóth Tibor | Claude-generated title vs. truncated first message | RESOLVED — Claude generates the title | conversation record; Linear TTO-11 |
| D-03 Claude model(s) for chat vs. title generation | Tóth Tibor | one model for both vs. a cheaper/faster model for title generation | RESOLVED — Claude Sonnet 5 (`claude-sonnet-5`) for both chat responses and title generation | conversation record; this file |
| D-04 branch protection on `main` | Tóth Tibor | wanted (yes); blocked on a private repo (GitHub Pro/Team/Enterprise required) — resolved by making the repo public instead of upgrading | RESOLVED — repo is now PUBLIC; branch protection on `main` enabled: required status check `checks`, PR required (0 approvals needed, solo repo), `enforce_admins: true`, no force-push/no deletion | `engineering-standard.md` §6; `plan.md` Risks |
| D-05 `npm audit` 2 moderate vulnerabilities | Tóth Tibor | fix now (possibly breaking) vs. defer | DEFERRED — explicitly not addressed now, by request | `workshop-evidence/01-helyzetkep.md`; conversation record |

## Common failures and Plan B

- **Hidden shared-file overlap:** pause; re-slice ownership before parallel edits.
- **Task exposes a product gap:** mark `BLOCKED` and return to the spec gate.
- **Configured check is unavailable:** record the failure; use the agreed
  local fallback, but do not claim the original check passed.
- **Plan no longer fits the code:** document evidence and request plan
  re-approval; do not silently expand scope.
- **Neon connectivity/credential failure (`DATABASE_URL` missing, expired, or
  unreachable):** this is a human decision (re-provision via
  `vercel env pull`, check the Neon project status), not something the coding
  agent resolves by silently falling back to a local file or a different
  persistence approach.
