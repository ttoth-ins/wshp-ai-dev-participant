# Given–When–Then scenarios — AI Assistant MVP

> **Agent-run technical contract:** the checks below are run by Claude Code or
> Codex and returned as evidence (command + exit code + relevant output), per
> `docs/constitution.md` → Canonical standards and real gates. They are not
> manual command-entry instructions for a human.

`STATUS: DRAFT — derived from docs/constitution.md and docs/spec.md, awaiting
human approval alongside the constitution`

Business intent is written in Hungarian first (with the spec author), then
recorded as an executable, English contract — per
[docs/spec.md](spec.md) and the boundaries in
[docs/constitution.md](constitution.md). Implementation paths referenced below
do not exist yet; each is tagged with the Linear issue that will create it
(`docs/constitution.md` → Stable public contracts: TTO-5…TTO-11).

## SC-01 — sent message appears immediately, in order (spec §1 Chat felület)

**Magyar szándék:** a felhasználó szöveges üzenetet ír, elküldi a Send gombbal,
és az üzenet azonnal megjelenik a beszélgetésben, időrendi sorrendben.

**Given** an active conversation is open, empty or with prior messages<br>
**When** the user types text and clicks **Send**<br>
**Then** the user's message appears at the end of the message list immediately,
without waiting for the AI response<br>
**And** messages remain in chronological order (oldest first)

## SC-02 — every message gets an AI response using full history (spec §2 AI válaszadás)

**Magyar szándék:** minden elküldött felhasználói üzenetre AI válasz érkezik,
ugyanabban a beszélgetésben, a teljes előzmény figyelembevételével.

**Given** a conversation with N prior messages (N ≥ 0)<br>
**When** the user sends a new message<br>
**Then** the AI response is appended to the end of the same conversation's
message list<br>
**And** the request sent to Claude includes the full prior message history of
that conversation, not just the latest message

## SC-03 — AI provider failure surfaces an error without corrupting state (spec §2, failure path)

**Magyar szándék:** ha a Claude API hibázik, a felhasználó értelmes hibaüzenetet
kapjon, és a beszélgetés ne sérüljön.

**Given** the user has sent a message and it was saved<br>
**And** the Claude API call fails (timeout, 5xx, or invalid response)<br>
**When** the backend handles the failure<br>
**Then** the client receives a clear error, not a silent hang or a crash<br>
**And** the user's message remains saved in the conversation<br>
**And** no fabricated AI message is persisted in its place

## SC-04 — New Chat creates a new active conversation, prior ones untouched (spec §3 Új beszélgetés)

**Magyar szándék:** a felhasználó bármikor új, üres beszélgetést indíthat; az
azonnal aktívvá válik, a korábbiak változatlanul megmaradnak.

**Given** one or more existing conversations, one of them currently active<br>
**When** the user clicks **New Chat**<br>
**Then** a new, empty conversation is created and becomes the active one<br>
**And** every previously existing conversation and its messages are unchanged

## SC-05 — messages survive an application restart (spec §4 Beszélgetések mentése)

**Magyar szándék:** minden felhasználói üzenet és AI válasz mentésre kerül, és
az alkalmazás újraindítása után is elérhető.

**Given** a conversation with at least one user message and one AI response<br>
**When** the application is restarted (server process restarts, storage file
is untouched)<br>
**Then** the conversation and all its messages are still retrievable, in the
same order, with the same content

## SC-06 — sidebar lists conversations and updates on creation (spec §5 Beszélgetések listázása)

**Magyar szándék:** a beszélgetések egy oldalsávban jelennek meg, rövid címmel,
és a lista új beszélgetés létrehozásakor automatikusan frissül.

**Given** the sidebar is showing the current list of conversations<br>
**When** the user creates a new conversation (SC-04)<br>
**Then** the sidebar list includes the new conversation without a manual page
reload<br>
**And** every listed conversation shows a title (see SC-08 for what that title is)

## SC-07 — opening a past conversation loads full history and continues it (spec §6 Korábbi beszélgetés megnyitása)

**Magyar szándék:** a felhasználó bármikor visszatérhet egy korábban mentett
beszélgetéshez; az összes korábbi üzenet betöltődik, és onnan folytatható.

**Given** a previously saved conversation with M messages exists and is not
the currently active one<br>
**When** the user selects it from the sidebar list<br>
**Then** all M messages load in chronological order in the chat view<br>
**And** sending a new message in this conversation includes all M prior
messages as history (same contract as SC-02)

## SC-08A — first message generates an automatic title (spec §7 Beszélgetés automatikus elnevezése)

**Magyar szándék:** az első felhasználói üzenet alapján a rendszer automatikusan
címet ad a beszélgetésnek, ami megjelenik a listában.

**Given** a new, empty conversation showing the placeholder title **New Chat**<br>
**When** the user sends their first message in it<br>
**Then** a short title is generated from that first message<br>
**And** the sidebar shows the generated title in place of **New Chat**

## SC-08B — title generation failure falls back to the placeholder (spec §7, failure path)

**Magyar szándék:** ha a címgenerálás hibázik, az ne blokkolja a chatet — a
beszélgetés ideiglenesen **New Chat** néven maradjon.

**Given** a new, empty conversation<br>
**When** the user sends their first message and the title-generation call
fails<br>
**Then** the user's message is still sent and answered normally (SC-01, SC-02
are unaffected)<br>
**And** the conversation keeps showing **New Chat** as its title rather than
erroring out or showing a broken title

## Test mapping

| Scenario | Spec § | Planned test level/file | Agent-run check (once implemented) | Boundary/failure value | Unchanged state on failure |
|---|---|---|---|---|---|
| SC-01 | §1 | component/unit — chat view (TTO-7) | `npm run test -- chat` | empty vs. non-empty conversation | n/a |
| SC-02 | §2 | unit/contract — chat endpoint (TTO-6) | `npm run test -- messages` | N=0 vs. N>0 prior messages | n/a |
| SC-03 | §2 | unit — chat endpoint, mocked Claude client failure (TTO-6) | `npm run test -- messages` | Claude API timeout / 5xx | saved user message untouched, no AI row written |
| SC-04 | §3 | unit/contract — conversations endpoint (TTO-8) | `npm run test -- conversations` | 0 vs. N existing conversations | prior conversations byte-for-byte unchanged |
| SC-05 | §4 | contract — DB module (TTO-5) | `npm run test -- db` | process restart (re-open same DB file) | none — this IS the assertion |
| SC-06 | §5 | component/unit — sidebar (TTO-9) | `npm run test -- sidebar` | 0 vs. N conversations | n/a |
| SC-07 | §6 | unit/contract — conversation-by-id endpoint (TTO-10) | `npm run test -- conversations` | M=1 vs. M>1 messages | n/a |
| SC-08A | §7 | unit — title generation (TTO-11) | `npm run test -- title` | first message only | n/a |
| SC-08B | §7 | unit — title generation, mocked failure (TTO-11) | `npm run test -- title` | title-gen call throws/times out | title stays `New Chat`, message flow (SC-01/SC-02) unaffected |

- Required fake/real adapter contract: once TTO-5 lands, the SQLite-backed
  conversation/message store needs a contract test that would pass against an
  in-memory fake too, so persistence logic isn't only exercised through the
  real file — see `docs/engineering-standard.md` §4 (module-level
  auto-testability).
- Browser-automated observation: `npm run test:e2e` (Playwright, headless
  Chromium), wired into CI — see `docs/constitution.md`. Currently only a
  harness smoke test exists (`e2e/smoke.spec.ts`); SC-01/04/06/07/08 get their
  own Playwright scenarios alongside the UI tasks that implement them (Linear
  TTO-7, TTO-9, TTO-10, tracked as TTO-12). Until each scenario has its own
  Playwright spec, manually driving the chat UI for it is an honestly labeled
  Plan B — never reported as an automated PASS.
