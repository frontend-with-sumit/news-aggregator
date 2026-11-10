# src/features/search

## Overview

The search feature: Redux state for the active search (`searchParamsSlice`), the merged
multi-provider query (the sibling `src/features/news/newsApi.ts`), and every UI
component/page for the results screen.

## Key files

| File | Owns |
|---|---|
| `searchParamsSlice.ts` | `SearchParamsState`: keyword, categories (ordered oldest→newest selected), sources, author, from/to, page |
| `pages/SearchResultsPage.tsx` | Composes the whole screen; the only place that calls `useSearchArticlesQuery` |
| `components/` | One component per concern: `SearchBar`, `FilterChips`, `MoreFilters` (collapsible author + date filters), `ArticleList`, `ArticleCard`(+`Skeleton`), `Pagination`, `StatusBanner` |

## Conventions

- `SearchParamsState` is passed directly as `SearchArticlesArgs` to `useSearchArticlesQuery`;
  keep the two shapes in sync when either changes.
- A debounced text input (`SearchBar`, `AuthorFilter`) follows one pattern: local `useState` for
  the in-flight value, a 400ms `useEffect`/`setTimeout` that dispatches only if it changed.
- A component never dispatches `searchParamsSlice`'s source/category directly; it dispatches
  `preferencesSlice`'s `toggleSource`/`toggleCategory`, and a `createListenerMiddleware` listener
  in `src/app/store.ts` re-syncs `searchParams` from the updated preferences. Keeps the two
  slices from drifting independently.
- A filter that isn't core to the primary flow (author, date range) goes inside the collapsible
  `MoreFilters` disclosure, not the always-visible header, to keep the mobile layout compact.

## Gotchas

- The merged feed is grouped by category, most-recently-selected category first (overriding a
  plain recency sort across the whole feed) — an intentional but `Assumed` (not yet
  `/architect`-ratified) decision. See spec 0004 before "simplifying" this back to a flat date
  sort.
- A source counts as "failed" (shown in `StatusBanner`) only if **every** one of its per-category
  fetches failed; a partial per-category failure is tolerated silently.
- Toggling the last remaining selected source/category is a silent no-op in `preferencesSlice`'s
  reducer, not an error; `FilterChips` just disables that chip — no separate validation needed
  here.

## Related specs

- `docs/specs/0002-search-aggregation-redux.md`
- `docs/specs/0003-search-results-page/`
- `docs/specs/0004-multi-category-search-grouping.md` (Assumed)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
