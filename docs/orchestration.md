# Agent orchestration — orchestrator / maker / reviewer

`STATUS: APPROVED — Tóth Tibor, 2026-07-14`

This file specifies how autonomous agentic development runs in this repo,
once the five-file spec package (`constitution.md`, `spec.md`,
`given-when-then.md`, `plan.md`, `tasks.md`) has been approved. It formalizes
what `tasks.md` → "RUG execution and closed-gate handoff" already sketched,
as an actually-running process, not just a description.

Three roles, three separate agent contexts. No role shares its conversation
history with another — only the artifacts below (Linear issue, handoff file,
diff/PR) cross the boundary.

## 1. Orchestrator

- Runs as a self-paced `/loop` in this session (interruptible at any time by
  the human — there is no separate always-on process).
- **Only the orchestrator may claim a Linear task.** It polls the
  **AI Assistant MVP** project and may pick up a task only if:
  - its Linear status is **`Todo`** (never `Backlog` — a task in `Backlog`
    hasn't been vetted as ready; see §4);
  - it has **no open `blockedBy` relation** (per `tasks.md` "Depends on/order");
  - it does not carry a `needs-human` label (see §5 — escalated tasks are
    frozen until a human clears the label).
- **Concurrency**: the orchestrator may dispatch **multiple** tasks at once,
  but only if their `Exclusive scope` (the `tasks.md` column of the same
  name) does not overlap with any task currently in flight. On overlap, the
  later task waits.
- On claiming a task: Linear status `Todo` → `In Progress`.
- Dispatches a **maker subagent** (§2) per claimed task.
- On the maker's return, dispatches a **reviewer subagent** (§3) — always a
  fresh context, never fed the maker's conversation, only the artifacts.
- Acts on the reviewer's verdict (§4).
- The orchestrator never touches `.github/workflows/ci.yml`, branch
  protection, or Vercel/Neon project settings — those remain human-owned,
  same as today.

## 2. Maker subagent (per task, fresh context)

Given only: the Linear issue ID, and pointers to the docs (`AGENTS.md`,
`engineering-standard.md`, `constitution.md`, `spec.md`, `given-when-then.md`,
`plan.md`, `tasks.md`).

1. **Validates executability first** — restates the linked AC(s) and
   exclusive scope, and confirms the task is concretely enough specified to
   implement without inventing product behavior (mirrors what the
   orchestrator/human did by hand for TTO-5 in this session — that
   validation step now belongs to the maker, since the orchestrator no
   longer inspects task content, only its Linear state and scope).
   - **If not executable**: does not implement. Reports back to the
     orchestrator with the specific gap. The orchestrator moves the Linear
     issue **back to `Backlog`** (not `Todo` — it needs human spec work
     first) with a comment naming the gap, and applies the `needs-human`
     label.
   - **If executable**: proceeds.
2. Implements strictly within the task's exclusive scope. New dependency,
   new top-level directory, or anything touching another task's scope →
   stop and report `DECISION REQUIRED` instead of expanding scope.
3. Runs the full Definition of Done (`engineering-standard.md` §6) locally,
   fixes until green.
4. Creates a branch, commits, pushes, opens a PR (never merges it itself —
   merge authority is the orchestrator's, per §4, not the maker's).
5. Writes a **handoff file** and returns it plus the PR URL to the
   orchestrator.

### Handoff file template

```md
## Handoff — <Linear ID> / <tasks.md TASK-ID>
- AC(s): ...
- Exclusive scope (files touched): ...
- DoD gate results: typecheck=<pass|fail> lint=<..> test=<..> build=<..> test:e2e=<..>
  (include exit codes and any relevant output tail, not just pass/fail)
- Testability approach: (e.g. fake/real adapter pattern, what the fake covers)
- PR: <url>
- Open risks / DECISION REQUIRED items: ...
```

## 3. Reviewer subagent (per task, always fresh context)

Given only: the Linear issue, the handoff file, and the diff/PR — **never**
the maker's own reasoning or conversation, so it cannot rubber-stamp its own
prior assumptions.

- Uses the `/code-review` skill's findings model: a ranked list of findings,
  each with a `CONFIRMED`/`PLAUSIBLE` verdict, most severe first — not free
  prose.
- Checks the diff against: the linked AC(s) in `spec.md`, the relevant
  scenarios in `given-when-then.md`, the boundaries in `constitution.md`
  (scope creep, forbidden areas, new dependencies), and the DoD evidence in
  the handoff file (does it actually support the claim, e.g. no silently
  skipped gate).
- Returns a verdict: **approved** (no `CONFIRMED` critical/high-severity
  finding) or **changes requested** (at least one).

## 4. What happens after review

- **Approved** → the **orchestrator merges the PR automatically**
  (`gh pr merge`), Linear issue → `Done`, and posts a Linear comment:
  "Auto-merged — reviewer verdict: approved, evidence: `<PR link>`." This
  uses the same GitHub credentials as the human's own session — there is no
  separate bot identity, so an auto-merge is effectively the same as the
  human merging it themselves. Acknowledged and accepted explicitly
  (2026-07-14) as the cost of full automation; revisit if it ever causes a
  bad merge.
- **Changes requested** → PR stays open, task goes back to the **maker**
  (same task, not necessarily the same agent instance) for a fix.
  - Round 1 fails review again → try once more (round 2).
  - Round 2 **still** has a `CONFIRMED` critical/high finding → **escalate**:
    `needs-human` label, Linear comment with the outstanding findings, task
    stays `In Progress`. The orchestrator will not touch this task again
    until a human removes the label.
- No task loops more than twice through maker→reviewer before escalating —
  this is a hard cap, not a suggestion, to avoid an unbounded agent-to-agent
  loop burning tokens on the same unresolved disagreement.

## 5. Labels used (in place of new Linear workflow states)

Linear's states stay exactly as they are (`Backlog`, `Todo`, `In Progress`,
`Canceled`, `Duplicate`, `Done`) — no new custom states, since those aren't
creatable through the available tooling. Two labels carry the extra nuance:

- **`in-review`** — applied while a reviewer subagent is actively evaluating
  a task's PR; removed once a verdict lands (approved-and-merged, or
  bounced back for another maker round).
- **`needs-human`** — applied on: (a) a maker reporting the task isn't
  executable as specified, or (b) two failed review rounds. The
  orchestrator treats this label as a hard skip signal — it will not pick
  the task up again, and will not re-dispatch a maker or reviewer against
  it, until a human clears the label.

## 6. Retroactive note — TTO-5

TTO-5 (the Neon persistence layer) was implemented and merged (PR #4,
2026-07-14) **before** this orchestration was formalized — it was a manual
one-off maker run, with the human merging the PR directly rather than an
orchestrator. Per explicit request, an independent reviewer pass is being
run retroactively against the already-merged change (see the Linear TTO-5
comment thread for the outcome) as the safety check this document would
otherwise have required before merge.

## 7. Explicitly out of scope for the orchestrator

- Branch protection, CI workflow, and Vercel/Neon settings (human-owned).
- Anything the constitution's Decision authority table marks `no` for the
  agent (product behavior, security/privacy exceptions, scope changes) —
  the maker's `DECISION REQUIRED` escalation path still applies unchanged.
- Legacy-system work, team-adoption artifacts (Modul 7–8) — this document
  covers the maker/reviewer loop for the AI Assistant MVP feature backlog
  only.
