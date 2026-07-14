# Mérnöki standard

Kanonikus, modell- és toolfüggetlen szerződés a repóban végzett munkára. Nem egy
konkrét agent-harness vagy prompt-trükk köré épül: bármelyik coding agent (Claude
Code, Codex, ...) ugyanezt a szerződést kell kövesse. Az `AGENTS.md` erre a
dokumentumra hivatkozik, nem duplikálja.

## 1. Tech stack (tényleges, jelenlegi állapot)

A verziók a `package.json`-ból és a helyi környezetből (`node -v`) származnak, nem
feltételezésből.

| Réteg | Csomag | Verzió |
|---|---|---|
| Futtatókörnyezet | Node.js | 22 (`actions/setup-node` a CI-ban; helyi `node -v` → 22.20.0) |
| App-keretrendszer | Next.js (App Router) | 16.2.10 |
| UI runtime | React / React DOM | 19.2.4 |
| Nyelv | TypeScript | ^5, `strict: true` (`tsconfig.json`) |
| Styling | Tailwind CSS | ^4 (`@tailwindcss/postcss`) |
| UI-komponensek | shadcn/ui | lokális forrás `src/components/ui/`-ban |
| Lint | ESLint | ^9, `eslint-config-next` 16.2.10 (flat config: `core-web-vitals` + `typescript`) |
| Teszt | Vitest | ^4.1.10, `environment: "node"` |
| E2E | Playwright (`@playwright/test`) | headless Chromium, `playwright.config.ts` |
| Hosting | Vercel | projekt linkelve és deploy-olva (`ttoth/wshp-ai-dev-participant`), Git-integráció bekötve |
| Adatbázis | Neon Postgres | Vercel Marketplace-integráció, `DATABASE_URL` env-en át (D-01, felülvizsgálva — lásd `constitution.md` v1.1); kliens még nincs implementálva (Linear TTO-5) |

Hitelesítés (auth) továbbra sincs bekötve és nem is lesz — szándékos non-goal
(lásd `constitution.md`). Ezt a standardot akkor bővítjük tovább, amikor egy
réteg ténylegesen megjelenik a repóban — nem korábban.

## 2. Projektstruktúra

```
src/
  app/              Next.js App Router: route-ok, layout-ok, page-ek
  components/ui/    shadcn/ui — szerkeszthető helyi forrás, nem fekete doboz
  lib/              megosztott segédfüggvények (pl. utils.ts)
docs/               spec-ek és ez a standard
```

- Új UI-építőelem csak `src/components/ui/`-ból jöhet; hozzáadása:
  `npx shadcn@latest add <component>` (a hivatalos telepítési úton, nem kézzel
  másolt kóddal).
- Új top-level mappát (pl. `src/server/`, `src/features/`) csak akkor vezetünk be,
  ha egy konkrét feature ezt ténylegesen megköveteli — nem előre, hipotetikus
  jövőbeli igényre.

## 3. Kódolási konvenciók

- **TypeScript strict módban fut** (`tsconfig.json` → `strict: true`). Nincs
  indokolatlan `any`; ha elkerülhetetlen, kommenttel indokolva.
- Import-alias: `@/*` → `src/*` (lásd `tsconfig.json` és `vitest.config.ts` —
  a kettő szándékosan tükrözi egymást).
- App Router alapértelmezés: Server Component, `"use client"` csak akkor, ha a
  komponens ténylegesen kliensoldali állapotot vagy böngésző-API-t használ.
- Styling kizárólag Tailwind utility class-okkal, a `DESIGN-GUIDELINE.md`
  tokenjei szerint. Inline style és új UI-lib bevezetése tilos.
- Egyszerűség elve: nincs új könyvtár, minta vagy absztrakció, ha a feladat nem
  igényli ténylegesen. Egy implementáció ⇒ nincs interface/abstract réteg
  mögötte.
- Kód, kommentek és commit üzenetek angolul.

## 4. Tesztelés

- Futtató: Vitest, `vitest.config.ts` — `include: ["src/**/*.test.{ts,tsx}"]`.
- A tesztek a lefedett kód mellett élnek (colocated), `*.test.ts`/`*.test.tsx`
  néven — lásd `src/lib/utils.test.ts` mintaként.
- Új logikához új teszt jár; meglévő teszt törlése vagy kihagyása csak akkor,
  ha a mögötte lévő viselkedés ténylegesen megszűnt.
- **Minden modul automatikusan tesztelhető legyen.** Egy modul (feature-szintű
  vertical slice, jellemzően egy Linear issue-nak megfelelő egység) csak akkor
  KÉSZ, ha van hozzá `npm run test`-tel, emberi beavatkozás/kézi kipróbálás
  nélkül lefutó automatikus teszt. Ez a README AI-natív ismérve
  ("minden feature önállóan FEJLESZTHETŐ és ELLENŐRIZHETŐ") mechanikus
  következménye.
- Ez azt igényli, hogy egy modul üzleti logikája (pl. egy route handler vagy
  Server Action magja) Vitesttel közvetlenül, HTTP-kérés vagy böngésző nélkül
  hívható legyen — elválasztva a keretrendszer-kötött rétegtől. Ez **nem**
  jelent kötelező interfészt vagy DI-réteget minden modulhoz (lásd 3. pont,
  egyszerűség elve): csak azt, hogy a logika ne legyen szétválaszthatatlanul
  összefonva a UI/route kóddal.
- Ha egy modulnak van olyan része, ami emberi vizuális ellenőrzést igényel
  (pl. layout, animáció), az a `DESIGN-GUIDELINE.md` szerinti review tárgya —
  de a modul mögötti logika/viselkedés attól még automatikusan tesztelhető
  marad.

## 5. Lint

- `eslint.config.mjs`: `eslint-config-next` `core-web-vitals` + `typescript`
  preset, flat config.
- A build-output mappák (`.next/`, `out/`, `build/`, `next-env.d.ts`) explicit
  ki vannak zárva (`globalIgnores`).
- Lint-hibával nem megy be commit; figyelmeztetést is érdemes lezárni, mielőtt
  a task készre jelentődik.

## 6. Definition of Done

Egy változás akkor KÉSZ, ha az alábbi kapuk mindegyike zöld. A parancsok a
`package.json` `scripts` mezőjéből és a `.github/workflows/ci.yml`-ből vannak
levezetve — ez a két forrás a hivatalos igazság, nem ez a dokumentum másolja
őket ötletszerűen.

| # | Kapu | Parancs | Mit ellenőriz | Elvárt eredmény | Kötelező mikor |
|---|---|---|---|---|---|
| 1 | Típusellenőrzés | `npm run typecheck` | `tsc --noEmit`, strict mode | exit 0, nincs típushiba | minden változás előtt |
| 2 | Lint | `npm run lint` | ESLint (`core-web-vitals` + `typescript`) | exit 0, nincs lint-hiba | minden változás előtt |
| 3 | Teszt | `npm run test` | `vitest run` | exit 0, minden teszt zöld | minden változás előtt; új logikához új teszt |
| 3b | Modul-tesztelhetőség | `npm run test` (az adott modul teszt-fájlja) | az adott modulhoz (feature/issue) tartozik legalább egy automatikus teszt | a modul viselkedése kézi lépés nélkül igazolt | minden új modul lezárása előtt |
| 4 | Build | `npm run build` | `next build` — éles build, ezt futtatja a Vercel is | exit 0 | PR nyitása / merge előtt kötelező |
| 4b | E2E | `npm run test:e2e` | Playwright, headless Chromium (`playwright.config.ts`) | exit 0, minden E2E-szcenárió zöld | PR nyitása / merge előtt kötelező |
| 5 | Összevont lokális kapu | `npm run typecheck && npm run lint && npm run test && npm run build && npm run test:e2e` | 1–4b együtt | mind exit 0 | task "kész"-nek jelentése előtt |
| 6 | CI | `.github/workflows/ci.yml` (`npm ci` → 1–4b ugyanabban a sorrendben, Playwright böngésző-telepítéssel) | ugyanaz az 5 kapu, tiszta környezetben | `completed success` a PR-on / `main`-en | minden push és pull request |

Megjegyzés: **branch protection élesítve** (döntés + végrehajtás, 2026-07-14).
A repo emberi döntésre PUBLIC-ra váltott (a klasszikus branch protection és a
repository rulesets is csak publikus repóra vagy Pro/Team/Enterprise csomagra
érhető el privát repón), majd a `main`-re bekötve: kötelező `checks` státusz
(a fenti 6 kapu), PR szükséges a mergehez (0 jóváhagyás elég — egyszemélyes
repo), `enforce_admins: true` (a repo tulajdonosára is vonatkozik, nincs
megkerülés), force-push és branch-törlés tiltva. A fenti kapuk a `main`-en
mostantól gépi kényszer, nem csak konvenció — beleértve azt is, hogy mostantól
**csak PR-en keresztül kerülhet kód a `main`-be**, közvetlen `git push` nem.

Nem-mechanikus DoD-elemek, amelyeket a gépi kapuk nem mérnek, de a review részei:
- A változás egy jóváhagyott spec/issue alapján készült (Linear: `issue = spec`).
- UI-változás esetén: megfelel a `DESIGN-GUIDELINE.md`-nek.
- Nincs indokolatlanul hozzáadott új függőség, absztrakció vagy hibakezelés
  olyan esethez, ami nem fordulhat elő.

## 7. Munkaállapot és spec forrás

A feladatok (issue = spec) a Linear **AI Assistant MVP** projektjében élnek
(`Ttoth` csapat). Ez a dokumentum a HOGYAN-t rögzíti; a Linear issue-k a MIT-et.
