# News Aggregator

A React/Redux single-page app that merges search results from three news providers (The
Guardian, NYT, NewsAPI) into one searchable, filterable, personalisable feed.

## Stack

- **Language / Runtime**: TypeScript 6.0 (strict mode, `noUncheckedIndexedAccess`), Node >= 26
- **Framework**: React 19.3, built with Vite 8.3
- **Key dependencies**: Redux Toolkit 2.14 (+ RTK Query for data fetching), React Redux 9.3, react-icons 5.7
- **Package manager**: npm
- **Provider proxy**: API keys stay server-side. Vite `server.proxy` (dev) / nginx (prod)
  forwards `/api/<source>/*` and injects the key — see spec 0001.

## Build approach

<TBD, set by /scope>

## Commands

```bash
# Install
npm install

# Dev server (copy .env.example to .env and add API keys first)
npm run dev

# Build
npm run build

# Test
npm test
```

## Specs

Stored in `docs/specs/`. Format: `docs/specs/NNNN-title.md` (a single file, or a directory with
`index.md` / `rationale.md` / `verify.md` once a spec needs splitting).

## Rules

- Path alias `@/*` → `./src/*`; use it instead of relative `../../..` imports.
- One Redux slice per domain (`preferences`, `searchParams`, `newsApi` as RTK Query). Always
  use the typed `useAppDispatch`/`useAppSelector` from `src/app/hooks.ts`, never plain `react-redux` hooks.
- Every provider adapter implements `NewsSource` (`src/services/news/types.ts`); UI/state code
  depends only on `Article`/`ArticleQuery`, never a provider's own response shape.
- Sibling `.css` per component; plain CSS custom properties, no framework. Light/dark theming
  via `data-theme` on `<html>` + `prefers-color-scheme` fallback, tokens in `src/styles/tokens.css`.
  Mobile-first (`min-width` media queries only).
- A debounced input (keyword search, author filter) follows one pattern: local `useState` +
  a 400ms `useEffect`/`setTimeout` that dispatches only if the value changed.
- Tests: Vitest + Testing Library; MSW mocks HTTP and fails the test on an unhandled request.
  Use `renderWithProviders` (`src/test/renderWithProviders.tsx`) for anything touching Redux.
- Before calling work done: typecheck, lint, test, build all clean.

## Agent skills

- [debug-redux-toolkit-apps](.agents/skills/evolve-and-diagnose-redux-apps-debug-redux-toolkit-apps/): `reduxjs/redux-toolkit`, diagnosing Redux state/subscription issues
- [adopt-rtk-query](.agents/skills/manage-server-data-adopt-rtk-query/): `reduxjs/redux-toolkit`, RTK Query conventions for server data (used by `newsApi`)
- [msw-general](.agents/skills/msw-general/): `msw-git/msw-ai-coding-plugins-official`, mocking HTTP in tests the way this project's test suite already does
- [vitest](.agents/skills/vitest/): `antfu/skills`, this project's test runner
- [vercel-react-best-practices](.agents/skills/vercel-react-best-practices/): `vercel-labs/agent-skills`, React 19 conventions

`react-router-declarative-mode` is installed but unused (`react-router-dom` was dropped with
the article detail page); remove with `npx skills remove react-router-declarative-mode` if routing won't return.

Declined: MCP servers (no official server exists for this stack; only unverified third-party options found).

## Context files

- [src/services/news/AGENTS.md](src/services/news/AGENTS.md) (provider adapters: conventions and provider-specific gotchas)
- [src/features/search/AGENTS.md](src/features/search/AGENTS.md) (search state and UI: conventions and gotchas)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
