# AI Assistant MVP – Funkcionális specifikáció

> **Agent-run technical contract:** the acceptance criteria and evidence
> commands below are executed by Claude Code or Codex and returned with exit
> codes/results. The human owns the product decisions and the APPROVED gate.

`STATUS: APPROVED`

Contract ID/version: AI-ASSISTANT-MVP v1.0
Constitution version/link: v1.0 — [constitution.md](constitution.md)
Human product owner: Tóth Tibor

## Áttekintés

Az alkalmazás egy egyszerű webes AI asszisztens, amely Claude nyelvi modellt használ a háttérben. A felhasználó új beszélgetéseket indíthat, kérdéseket tehet fel, valamint később visszatérhet a korábban elmentett beszélgetésekhez.

A cél egy minimálisan működő (MVP) alkalmazás elkészítése, amely egy fél napos workshop során megvalósítható.

---

## 1. Chat felület

### Leírás

Az alkalmazás fő felülete egy chat, ahol a felhasználó üzeneteket küldhet az AI asszisztensnek és megtekintheti a válaszokat.

### Elvárt működés

- A felhasználó szöveges üzenetet írhat.
- Az üzenet elküldhető egy **Send** gombbal.
- Az elküldött üzenet azonnal megjelenik a beszélgetésben.
- Az AI válasza megjelenik az üzenetlista végén.
- Az üzenetek időrendi sorrendben jelennek meg.

---

## 2. AI válaszadás

### Leírás

Az alkalmazás a háttérben Claude modellt használ a felhasználó kérdéseinek megválaszolására.

### Elvárt működés

- Minden elküldött felhasználói üzenetre AI válasz érkezik.
- A válasz ugyanabban a beszélgetésben jelenik meg.
- Az AI mindig a teljes beszélgetési előzményt figyelembe véve válaszol.

---

## 3. Új beszélgetés létrehozása

### Leírás

A felhasználó bármikor új beszélgetést indíthat.

### Elvárt működés

- A **New Chat** gombra kattintva új, üres beszélgetés jön létre.
- Az új beszélgetés azonnal aktívvá válik.
- A korábbi beszélgetések változatlanul megmaradnak.

---

## 4. Beszélgetések mentése

### Leírás

Minden beszélgetés automatikusan mentésre kerül.

### Elvárt működés

- A felhasználói üzenetek mentésre kerülnek.
- Az AI válaszai szintén mentésre kerülnek.
- A beszélgetések az alkalmazás újraindítása után is elérhetők.

---

## 5. Beszélgetések listázása

### Leírás

Az alkalmazás megjeleníti a korábban létrehozott beszélgetések listáját.

### Elvárt működés

- A beszélgetések egy oldalsávban jelennek meg.
- Minden beszélgetéshez egy rövid cím tartozik.
- A lista automatikusan frissül új beszélgetés létrehozásakor.

---

## 6. Korábbi beszélgetés megnyitása

### Leírás

A felhasználó bármikor visszatérhet egy korábban mentett beszélgetéshez.

### Elvárt működés

- A listából kiválasztott beszélgetés megnyitható.
- Az összes korábbi üzenet betöltődik.
- A beszélgetés ugyanonnan folytatható, ahol korábban abbamaradt.

---

## 7. Beszélgetés automatikus elnevezése

### Leírás

Az alkalmazás automatikusan nevet ad az új beszélgetéseknek.

### Elvárt működés

- Az első felhasználói üzenet alapján automatikusan létrejön egy cím.
- A cím a beszélgetések listájában jelenik meg.
- Ha még nincs üzenet a beszélgetésben, ideiglenesen **New Chat** néven jelenik meg.

---

## Nem része a projektnek

Az alábbi funkciók nem részei a workshop során elkészítendő alkalmazásnak:

- Felhasználói regisztráció vagy bejelentkezés
- Többfelhasználós működés
- Valós idejű (streaming) válaszok
- Markdown vagy kódkiemelés
- Fájl- vagy képfeltöltés
- Hangalapú kommunikáció
- Képgenerálás
- Beszélgetések törlése vagy átnevezése
- Modellválasztás
- RAG (Retrieval-Augmented Generation)
- Tool Calling vagy MCP integráció
- Prompt sablonok

---

## Acceptance criteria

Observable language; részletes forgatókönyvek: [given-when-then.md](given-when-then.md).

| ID | Observable behavior | Scenario(s) | Required evidence |
|---|---|---|---|
| AC-01 | A sent message appears immediately, in chronological order, before the AI response arrives. | SC-01 | `npm run test -- chat` + `npm run test:e2e` (Playwright scenario added alongside TTO-7/TTO-12) |
| AC-02 | Every user message gets an AI response in the same conversation, generated from the full prior history. | SC-02 | `npm run test -- messages` |
| AC-03 | New Chat creates a new, empty, active conversation; every previously existing conversation is unchanged. | SC-04 | `npm run test -- conversations` |
| AC-04 | User messages and AI responses persist across an application restart. | SC-05 | `npm run test -- db` |
| AC-05 | The sidebar lists conversations with a title each, and updates when a new one is created. | SC-06 | `npm run test -- sidebar` |
| AC-06 | Opening a past conversation loads all its messages in order and lets it continue with full history. | SC-07 | `npm run test -- conversations` |
| AC-07 | The first message in a conversation generates an automatic title; before that, the conversation shows "New Chat". | SC-08A, SC-08B | `npm run test -- title` |

## Failure and edge behavior

- AI provider failure (Claude API timeout/5xx): the user's message stays saved,
  a clear error is shown, no fabricated AI message is persisted (SC-03).
- Title-generation failure: does not block sending/answering; the conversation
  keeps showing "New Chat" (SC-08B).
- State that must remain unchanged on failure: on any of the above, previously
  saved conversations/messages are untouched.
- Concurrency/time/locale considerations: single-user local MVP (no
  auth/multi-user, per non-goals); timestamps ISO 8601 UTC.

## Evidence required for done

- Automated tests and agent-run commands: per-feature commands in the
  Acceptance criteria table above; combined gate:
  `npm run typecheck && npm run lint && npm run test && npm run build`.
- Browser-automated verification: `npm run test:e2e` (Playwright, wired into
  CI). Currently a harness smoke test only; per-feature scenarios land with
  TTO-7/TTO-9/TTO-10 and TTO-12. Until a given scenario has its own Playwright
  spec, a manual/agent-driven pass is an honestly labeled Plan B — never
  reported as an automated PASS.
- Documentation/decision record: this spec, [plan.md](plan.md),
  [tasks.md](tasks.md); deviations logged in the relevant Linear issue comment.
- Required independent reviewer roles: independent fresh-context reviewer
  (Modul 4) — not yet run in this repo, tracked as an open item in
  [tasks.md](tasks.md).
- Evidence location: the corresponding Linear issue (TTO-5…TTO-11) comment —
  command, exit code, output tail.

## Open decisions

| Decision | Owner | Options and observable impact | Status |
|---|---|---|---|
| D-03: which Claude model(s) for chat responses vs. title generation | Tóth Tibor | affects cost/latency/quality, not the observable acceptance criteria above | RESOLVED — Claude Sonnet 5 (`claude-sonnet-5`) for both chat responses and title generation (see [tasks.md](tasks.md)) |

## Builder restatement

Before planning or editing, the builder restates:

- the 7 features and their acceptance criteria (AC-01…AC-07);
- in-scope vs. the explicit non-goals list above;
- no open decisions remain (D-03 resolved — Claude Sonnet 5 for both chat and
  title generation);
- planned evidence (commands in the table above + Linear issue comments).

Mismatch returns to specification; it is not corrected only in chat.

## Human spec gate

Gate verdict: `APPROVED`

- Contract version approved: AI-ASSISTANT-MVP v1.0
- Approved by: Tóth Tibor
- Approved at: 2026-07-14 (pontos időpont nem rögzítve)
- Remaining owned risks: D-03 (model choice) resolved — Claude Sonnet 5; E2E
  harness wired (Playwright), per-feature scenarios still to be added
  alongside TTO-7/TTO-9/TTO-10 (tracked as TTO-12); branch protection on
  `main` approved but currently blocked by the GitHub plan/repo visibility
  (see constitution.md).
- Next action: plan ([plan.md](plan.md)) → tasks ([tasks.md](tasks.md)) →
  implementation (Linear TTO-5…TTO-12).