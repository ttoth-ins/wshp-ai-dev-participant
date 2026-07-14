# Repo-helyzetkép

Készült: 2026-07-14, a bootstrap (starter-másolás + preflight) után.

## A repo célja

A Wenova AI-Assisted Development Workshop résztvevői repója: a `participant-starter`
sablonból kimásolt, minimális Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
technikai hordozó. Még **nem** agent-ready fejlesztési rendszer — a nap során alakul azzá
(mission, repo-szabályok, kanonikus standard, spec-kapu, RUG, gépi ellenőrzések), majd erre
épül a nap munkadarabja, a **KK-Regisztráció** nevű kitalált üzleti kérés.

## Amit az agent feltételezhet

- A repo a `C:\work\wshp-ai-dev-participant` mappában él, a `main` ágon, tiszta working
  tree-vel (forrás: `git status`, `git branch -vv` — commit `5d43279`).
- A remote a privát `ttoth-ins/wshp-ai-dev-participant` GitHub-repo, default branch: `main`
  (forrás: `gh repo view --json visibility,defaultBranchRef` → `PRIVATE`, `main`).
- A függőségek a lockfile szerint telepítve vannak: 627 csomag (forrás: `npm install` kimenete).
- A teljes lokális preflight zöld: `npm run typecheck`, `npm run lint`, `npm run test` (1/1),
  `npm run build` — mind exit 0 (forrás: parancskimenetek, 2026-07-14).
- A GitHub Actions CI az első push-ra lefutott és zöld (forrás: `gh run list` →
  run `29319890722`, `completed success`, 44s).
- Környezet: Node v22.20.0, npm 10.9.3, `gh` CLI bejelentkezve `ttoth-ins` fiókkal,
  `repo` + `workflow` scope-okkal (forrás: `node -v`, `npm -v`, `gh auth status`).
- A repo működési szerződése az `AGENTS.md`; minden vizuális munkát a
  `DESIGN-GUIDELINE.md` szabályoz; UI-építőelem csak a `src/components/ui/`-ból jöhet.

## Amit az agent nem feltételezhet

- Hogy az `.mcp.json`-ban felsorolt MCP-szerverek (Linear, Neon, Vercel, GitHub)
  ebben a munkakönyvtárban ténylegesen csatlakoznak — OAuth-hitelesítés itt még nem történt.
- Hogy létezik adatbázis vagy `DATABASE_URL` — az `.env.example` szándékosan üres váz,
  az adatbázis a nap későbbi blokkjában kerül be.
- Hogy a GitHub-repón van branch protection vagy kötelező PR-check — ez még nincs beállítva,
  a merge-kapuk bekötése későbbi állomás.
- Hogy a `DESIGN-GUIDELINE.md` teljes — jelenleg váz, a nap során töltődik fel.
- Hogy az `npm audit` által jelzett 2 moderate sérülékenység kezelhető `--force`-szal —
  az breaking change lenne, emberi döntés nélkül tilos.
- Hogy a közös workshop-forrásrepo (`C:\work\ai-ws`) módosítható — az csak olvasható minta.

## Ellenőrzési mód

- Pontos parancs: `npm run typecheck && npm run lint && npm run test && npm run build`
  (lokálisan), illetve `gh run list --repo ttoth-ins/wshp-ai-dev-participant --limit 1` (CI).
- Várt, megfigyelhető eredmény: mind a négy lokális kapu exit 0; a CI-futás
  `completed success` állapotú a `main` ágon.
- Tényleges eredmény: mind a négy lokális kapu zöld; CI run `29319890722` →
  `completed success` (2026-07-14 08:57 UTC).
- Állapot: ELLENŐRZÖTT

## Ismeretlenek

1. Kérdés: Az MCP-integrációk (Linear, Neon, Vercel) hitelesítése mikor és milyen
   fiókokkal történjen meg ebben a repóban?
   Miért számít: az agent-lánc (issue = spec, DB-branch, preview-deploy) enélkül megszakad.
   Válaszadó szerep: ember (résztvevő), a megfelelő workshop-állomásnál.
   Addig tiltott feltételezés: hogy az agent MCP-n át elér bármely külső rendszert.
2. Kérdés: Kell-e branch protection / kötelező CI-check a `main` ágra, és mikor?
   Miért számít: enélkül a merge-kapu csak konvenció, nem gépi kényszer.
   Válaszadó szerep: ember; a gépi kapuk bekötése a C4–C5 állomás témája.
   Addig tiltott feltételezés: hogy a `main`-re csak zöld check-kel kerülhet kód.
3. Kérdés: A 2 moderate npm-audit sérülékenységet kezeljük-e, és hogyan?
   Miért számít: a `--force` javítás breaking change; a kockázat/haszon mérlegelése
   emberi döntés.
   Válaszadó szerep: ember.
   Addig tiltott feltételezés: hogy az audit-figyelmeztetés ignorálható vagy
   automatikusan javítható.

## Szerephatárok

- Modell: elemez, javasol, spec-et és tervet fogalmaz; nem dönt scope-ról.
- Coding agent: a jóváhagyott scope-on belül végrehajt, a kapukat futtatja és zöldre
  viszi; eltérést csak kimondva és dokumentálva tehet.
- Ember: jóváhagyja a bootstrap-evidence-t, a spec-et és minden merge-öt; ő dönt a
  fenti ismeretlenekről.
- Független ellenőrző: friss kontextusú review (RUG) a maker munkáján; visszajelzése
  nem gospel — implementálás előtt verifikálandó.

## Következő emberi döntés

A bootstrap-evidence elfogadása: ha a fenti ellenőrzött állapot megfelel, az ember
jóváhagyja, és ezzel indulhat az első feature-állomás (a README „Hogyan használd"
5. pontja szerint feature csak elfogadott bootstrap-evidence után kezdhető).
