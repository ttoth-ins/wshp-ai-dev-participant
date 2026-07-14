# Project constitution — AI Assistant MVP

> **Agent-run technical contract:** the exact commands below are selected and
> executed by Claude Code or Codex. The human approves behavior, scope, and
> evidence; nobody is required to reproduce the syntax by hand.

`STATUS: APPROVED`

This file records invariants that every feature specification, plan, task, and
implementation in this repository must obey. Keep it short, versioned, and
owned. A feature cannot silently override it.

## Identity and mission

- Product/repository mission: a résztvevői starter repo (Next.js App Router +
  TypeScript + Tailwind + shadcn/ui) agent-ready fejlesztési rendszerré
  alakítva; az **AI Assistant MVP** — egy Claude-alapú webes chat asszisztens,
  mentett és folytatható beszélgetésekkel — az egyetlen validációs workload,
  amely a spec-kaputól a review-zott eredményig végigmegy. Spec forrás:
  [docs/spec.md](spec.md).
- Primary users and outcomes: egyetlen (nem regisztrált) felhasználó — a
  workshop-résztvevő/demó-felhasználó; kimenet egy működő, tesztelt,
  review-zható chat alkalmazás, mentett beszélgetés-előzménnyel.
- Explicit non-goals (`docs/spec.md` → „Nem része a projektnek”):
  felhasználói regisztráció/bejelentkezés, többfelhasználós működés, streaming
  válasz, markdown/kódkiemelés, fájl-/képfeltöltés, hangalapú kommunikáció,
  képgenerálás, beszélgetés törlése/átnevezése, modellválasztás, RAG, Tool
  Calling/MCP-integráció, prompt sablonok.

## Non-negotiable boundaries

- Allowed modules/data: `src/app/**`, `src/components/ui/**` (csak a shadcn
  CLI-n keresztül bővítve), `src/lib/**`, `docs/**`; a leendő perzisztencia-
  réteg futásidejű adatfájlja gitignore-olva (lásd Linear TTO-5).
- Forbidden modules/data: `src/components/ui/**` kézi, CLI-n kívüli átírása;
  új npm-függőség bevezetése ok nélkül; a közös workshop-forrásrepo
  (`C:\work\ai-ws`) és a benne lévő `reference-app` szerkesztése — azok csak
  olvasható minták, sosem célfájlok ebben a repóban.
- Stable public contracts: még nincs implementálva; a `POST /api/conversations`,
  `GET /api/conversations`, `GET /api/conversations/[id]`,
  `POST /api/conversations/[id]/messages` végpontok szerződését a Linear
  TTO-5…TTO-11 issue-k rögzítik feature-önként, ahogy elkészülnek.
- Authorization and privacy invariants: nincs autentikáció (szándékos
  non-goal); nincs valós személyes adat — csak a beszélgetés szövege, amit a
  résztvevő maga visz be; titkos kulcs (`ANTHROPIC_API_KEY`) kizárólag
  `.env.local`-ban, sosem commitolva.
- Public-repository hygiene: a repo **PUBLIC** (`ttoth-ins/wshp-ai-dev-participant`
  — 2026-07-14-től, hogy a branch protection beköthető legyen, lásd D-04 a
  `tasks.md`-ben) — nincs secret, valós ügyfélnév vagy valós személyes adat a
  git historyban (`.env*` gitignore-olva, `.env.example` üres váz). Mivel a
  repo ténylegesen nyilvános, ez most terhelő kötelezettség, nem elővigyázatosság.
- Supported compatibility/locale/time assumptions: modern evergreen böngésző
  (Chrome/Edge/Firefox aktuális verzió); UI nyelve magyar/angol vegyíthető, kód
  és commit angol (lásd `AGENTS.md`); tárolt időbélyegek ISO 8601, UTC.

## Canonical standards and real gates

- Repository instructions: [AGENTS.md](../AGENTS.md).
- Engineering standard: [docs/engineering-standard.md](engineering-standard.md).
- Required check commands:
  - Format/lint: `npm run lint`
  - Type/build: `npm run typecheck` (release-készültséghez: `npm run build`)
  - Unit/contract/integration: `npm run test` (Vitest; minden modulhoz külön
    automatikus teszt — lásd engineering-standard.md 4. és DoD 3b pont)
  - End-to-end/manual: `npm run test:e2e` (Playwright, headless Chromium),
    bekötve a CI-ba is (`.github/workflows/ci.yml`). Jelenleg egyetlen smoke
    teszt van (`e2e/smoke.spec.ts`) — a chat-funkciókhoz (SC-01, SC-04, SC-06,
    SC-07, SC-08) tartozó valódi forgatókönyvek a megfelelő UI-feature-ökkel
    együtt készülnek el (Linear TTO-7, TTO-9, TTO-10).
  - Security/public-content: `npm audit` (2 moderate sérülékenység ismert,
    kezelésük emberi döntésre vár — lásd `workshop-evidence/01-helyzetkep.md`);
    diff-review arra, hogy nincs valós személyes adat vagy secret a változásban.
- Evidence location: bootstrap-szintű evidence → `workshop-evidence/`;
  feature-szintű evidence (parancs, exit code, kimenet-vég) → az adott Linear
  issue kommentje.

## Decision authority

| Decision type | Human owner | Agent may decide? | Escalation path |
|---|---|---|---|
| Product behavior | Tóth Tibor | no | `DECISION REQUIRED` (Linear issue komment) |
| Architecture inside approved boundaries | Tóth Tibor | with evidence (zöld DoD-kapuk) | code review (PR) |
| Security/privacy exception | Tóth Tibor | no | stop and escalate |
| Scope change | Tóth Tibor | no | return to spec gate (Linear issue frissítése) |

## Change control

- Constitution version: v1.0 (jóváhagyott — a korábbi v0.1 draftot váltja)
- Approved by: Tóth Tibor
- Approved at: 2026-07-14 (pontos időpont nem rögzítve)
- Next review: az implementáció megkezdése előtt (Linear TTO-5, C4 maker-blokk)
- Supersedes: v0.1 (draft)

A feature that conflicts with this constitution is `BLOCKED` until a human owner
changes the constitution or the feature. The implementation agent must not
invent an exception.

## Constitution gate

- [x] Mission and non-goals are explicit.
- [x] Boundaries and stable contracts are named (stable contracts still TBD per
      feature, explicitly marked, not invented).
- [x] Real check commands and evidence location are known (E2E gap named
      openly, not hidden).
- [x] Decision owners are named.
- [x] No unresolved contradiction exists.
- [x] Human approval, version, and timestamp are recorded. — Tóth Tibor,
      2026-07-14, v1.0.
