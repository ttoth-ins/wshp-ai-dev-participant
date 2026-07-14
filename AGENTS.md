<!-- BEGIN:nextjs-agent-rules -->
# Next.js: always read the version-matched docs before coding

Before any Next.js work, find and read the relevant documentation in
`node_modules/next/dist/docs/`. The installed documentation is the source of
truth for this project's Next.js version.
<!-- END:nextjs-agent-rules -->

# Agent rules

Starter for a small website built with AI-assisted development
(Next.js App Router + TypeScript + Tailwind + shadcn/ui).

The canonical engineering standard — stack, project structure, coding
conventions, testing, lint, and the Definition of Done — lives in
`docs/engineering-standard.md`. This file is the short, agent-facing rule set;
it does not duplicate the standard, it points to it.

## Rules

1. Follow `DESIGN-GUIDELINE.md` for anything visual.
2. UI building blocks come from `src/components/ui/` (shadcn/ui — local source,
   you may edit it). Add new ones with `npx shadcn@latest add <component>`.
3. Keep it simple: no new libraries, patterns, or abstractions unless the task
   truly needs them. One implementation ⇒ no interface.
4. Code, comments, and commit messages are English.
5. Follow `docs/engineering-standard.md` for structure and coding conventions.
6. Before declaring any task done, run and fix until green:
   `npm run typecheck && npm run lint && npm run test && npm run build && npm run test:e2e`
   (the same gates the CI workflow `.github/workflows/ci.yml` runs on every
   push and pull request — see the Definition of Done table in
   `docs/engineering-standard.md` for what each one checks).
7. Work items are specs: features are implemented against an approved Linear
   issue in the **AI Assistant MVP** project (`Ttoth` team), not from ad-hoc
   instructions.

> This file grows during the workshop — every recurring correction you give
> the agent belongs here as a rule.
