# 0002. Search aggregation and Redux state layer

**Date**: 2026-11-09
**Status**: Accepted

## Summary

This decides how the app combines search results from the three news providers into one feed, and how that
feed, the user's current search, and their saved preferences (favorite sources and categories) are held in
Redux. It uses RTK Query (already part of the installed Redux Toolkit) to fetch from all three providers in
parallel and merge them, instead of hand writing the fetch and loading state logic. This spec covers the state
layer only; the search bar, filter controls, and results list UI are a separate, later slice.

## Context

Three `NewsSource` adapters (Guardian, NYT, NewsAPI, built in spec 0001) each expose the same `search(query,
signal): Promise<Article[]>` shape, but each has its own pagination scheme and no shared sense of "one page of
the combined feed." Nothing yet decides how their results get merged, sorted, or paginated together, nor how
a failure in one provider (common on free tier rate limits) should affect the other two. The Redux store
(`src/app/store.ts`) is still empty: no slice yet holds the user's current search, their saved preferences, or
the fetched results, and the README's description of a "personalisable feed" has no concrete definition yet of
what gets personalised or where that preference lives.

## Requirements

**User stories**:
- As a reader, I want to search news by keyword and/or category and see one combined, sorted feed from all the
  sources I care about, so I don't have to check three sites separately.
- As a reader, I want my preferred sources and categories remembered, so the feed is already relevant when I
  open the app again.
- As a reader, if one provider is down or rate limited, I still want to see the news from the providers that
  worked, so one broken API key doesn't blank my whole feed.

**Acceptance criteria**:
- **AC-1**: Searching with a keyword and/or category merges results from every currently selected source into
  one feed, sorted by `publishedAt` descending.
- **AC-2**: On first load, with no search yet performed, the feed is populated automatically from the user's
  preferred sources and the first of their preferred categories (no empty "type something" state).
- **AC-3**: If one or more, but not all, selected sources fail or are rate limited, the feed still shows the
  articles from the sources that succeeded, and each failure is reported per source (not as one generic error).
- **AC-4**: Toggling a preferred source or category updates the active search immediately and refetches; no
  separate "apply" action is required.
- **AC-5**: Preferred sources and preferred categories persist in `localStorage` across page reloads.
- **AC-6**: If the stored preferences are missing, corrupted, or from an incompatible shape, the app falls back
  to the default preferences (all 3 sources, `['general']` category) without crashing.
- **AC-7**: Changing the page fetches that same page number from every selected source, merges, and re-sorts
  the combined result, replacing the previous page's articles.

## Options considered

### Option 1: RTK Query for fetching, two plain slices for params and preferences (recommended)

RTK Query (`createApi`, already available through the installed `@reduxjs/toolkit`) owns one endpoint,
`searchArticles`, that fans out to the three adapters, merges, and sorts. Two small `createSlice` slices hold
`searchParams` (the active query) and `preferences` (persisted favorites); the component layer later reads
`searchParams` and calls the RTK Query hook with it as the argument.

**Pros**:
- No new dependency; RTK Query ships inside `@reduxjs/toolkit`, which is already installed.
- Request caching, deduping, and loading/error state come for free, keyed by the serialized search args, exactly what's needed to avoid refetching an unchanged query.
- A stale in-flight request from a fast-changing filter is handled by RTK Query's own subscription model, no manual cancellation code to write or test.

**Cons**:
- RTK Query's cache-key-based model means the merge/sort logic lives inside the endpoint's `queryFn`, which is slightly less visible than a plain thunk's step-by-step code.

### Option 2: Hand-written `createAsyncThunk` and a single `search` slice

One thunk fetches from all three adapters with `Promise.allSettled`, merges and sorts the results, and a single
slice holds params, preferences, loading state, results, and per-source errors together.

**Pros**:
- Every step of the fetch/merge/error logic is explicit in one function, easy to read top to bottom.

**Cons**:
- Hand-rolls exactly what RTK Query already provides: loading state, caching by args, avoiding duplicate in-flight requests for the same query. More code, more to keep correct, for no capability gain.
- A single slice holding params, preferences, and results couples three concerns (user input, persisted settings, fetched data) that have different lifecycles and should be testable independently.

## Decision

**Chosen option**: Option 1: RTK Query for fetching, two plain slices for params and preferences

## Rationale

The deciding factor is that RTK Query is already installed as part of `@reduxjs/toolkit` and solves exactly
the problems this feature has: deduping requests for an unchanged query, tracking loading/error state per
query, and not needing manual cancellation when a filter changes quickly. Option 2 would hand-write all of
that for no benefit, which conflicts with keeping the codebase free of redundant logic. Splitting `searchParams`
(ephemeral, changes on every keystroke/filter) from `preferences` (persisted, changes rarely) follows from their
different lifecycles: one is reset on reload, the other survives it, and keeping them as separate slices means
each can be tested and reasoned about on its own.

## Feature design

**Data model sketch**:

| Entity | Fields | Notes |
|---|---|---|
| `preferences` (slice, persisted to `localStorage`) | `preferredSources: SourceId[]` (default: all 3) · `preferredCategories: Category[]` (default: `['general']`) | Loaded once at store setup; a parse/shape failure falls back to these defaults (AC-6) |
| `searchParams` (slice, in-memory) | `keyword: string` (default `''`) · `category: Category \| null` (default: first of `preferredCategories`) · `sources: SourceId[]` (default: `preferredSources`) · `page: number` (default `1`) | Re-seeded from `preferences` whenever a preference changes (AC-4) |
| `searchArticles` (RTK Query endpoint, api slice `newsApi`) | args: the current `searchParams` shape · result: `{ articles: Article[]; sourceErrors: { source: SourceId; message: string }[] }` | Cache key is the serialized args object; `queryFn` fans out to `NEWS_SOURCES`, one call per `sources` entry |

Relationship: `searchParams` is seeded from `preferences` on load and whenever a preference changes (not a
stored foreign key, an initialization rule); `searchArticles` always reads its args from the current
`searchParams` value.

**State transitions**: not applicable (no entity with a lifecycle beyond RTK Query's own built-in
`uninitialized → pending → fulfilled/rejected` per query, which RTK Query manages itself).

**Interface surface** (Redux actions/selectors and the one RTK Query endpoint, the client-side equivalent of
an API surface for this state layer):

| Interface | Kind | Key inputs | Key outputs | Errors |
|---|---|---|---|---|
| `searchParamsSlice.actions.setKeyword/setCategory/setPage` | action | `string` / `Category \| null` / `number` | updates `searchParams` | n/a |
| `preferencesSlice.actions.toggleSource/toggleCategory` | action | `SourceId` / `Category` | updates `preferences`, re-seeds `searchParams` (AC-4), persists to `localStorage` | n/a |
| `newsApi.useSearchArticlesQuery(searchParams)` | RTK Query hook | current `searchParams` | `{ articles, sourceErrors, isLoading, isFetching, error }` | per-source errors in `sourceErrors`; `error` only when every selected source fails |
| `selectActivePreferences` / `selectActiveSearchParams` | selector | n/a | current slice state | n/a |

**Value sourcing** (every value an acceptance criterion needs, traced to where it comes from):

| Action | Value produced / displayed | Source |
|---|---|---|
| Merge feed (AC-1) | sort key (`publishedAt`) | `Article.publishedAt`, already returned by every adapter (spec 0001) |
| Initial load (AC-2) | starting category | `preferences.preferredCategories[0]`, falling back to `'general'` if the list is ever empty |
| Initial load (AC-2) | starting sources | `preferences.preferredSources` |
| Partial failure (AC-3) | per-source error message | the adapter's thrown `Error.message` (already descriptive, e.g. `Request to … failed with status 500`), caught per source inside `searchArticles`'s `queryFn` and collected into `sourceErrors` |
| Preference toggle (AC-4) | re-seeded `searchParams.sources`/`category` | `preferences` slice's new state, applied via a listener/extraReducer on the preference action |
| Persistence (AC-5) | stored shape | `JSON.stringify(preferences)` written to `localStorage` key `news-aggregator:preferences` on every change |
| Bad stored data (AC-6) | fallback preferences | the slice's own default initial state, used when `JSON.parse` throws or the parsed shape fails a basic validation check (both `SourceId[]` and `Category[]`, using the existing `SOURCE_IDS`/`CATEGORIES` const arrays to validate) |
| Pagination (AC-7) | page number sent to each adapter | `searchParams.page`, passed as-is to every selected source's `search()` call |

**Key invariants**:
- `searchParams.sources` is always a non-empty subset of `SOURCE_IDS`; if a preference toggle would empty it, the toggle is rejected (at least one source must remain selected).
- `preferences.preferredCategories` is always non-empty (same rule, using `CATEGORIES`).
- `searchArticles`'s `sourceErrors` never includes a source that is not in the request's `sources` list.

**Security model**: not applicable; no authentication or per-user data exists, preferences are per-browser via
`localStorage`, and all data is public news content.

**Configuration required**: none. No new environment variables; the three provider keys are already handled
by the proxy decided in spec 0001.

**Critical test scenarios**:
- Happy path: search with a keyword merges and sorts articles from all 3 sources into one list, verifies **AC-1**.
- Failure case: one source's adapter rejects (simulate via MSW returning a 500) while the other two succeed; the feed still shows their articles and `sourceErrors` has exactly one entry, verifies **AC-3**.
- Edge case: `localStorage` holds `{"preferredSources": "not-an-array"}` (an invalid shape); the preferences slice initializes to the defaults instead of throwing, verifies **AC-6**.

## Build plan

1. Add `preferencesSlice` (`src/features/preferences/preferencesSlice.ts`): state, reducers (`toggleSource`,
   `toggleCategory`), default state, `localStorage` read on init with the try/catch fallback and a basic shape
   check against `SOURCE_IDS`/`CATEGORIES`, and a write on every change (a small subscribe in `store.ts` or a
   `listenerMiddleware` entry). Satisfies **AC-5**, **AC-6**.
2. Add `searchParamsSlice` (`src/features/search/searchParamsSlice.ts`): state, reducers (`setKeyword`,
   `setCategory`, `setPage`), and a `preferences/toggleSource` and `preferences/toggleCategory`
   `extraReducers` hook that re-seeds `sources`/`category` from the new preferences. Satisfies **AC-2**, **AC-4**.
3. Add the `newsApi` RTK Query api slice (`src/services/news/newsApi.ts`) with the `searchArticles` endpoint:
   `queryFn` calls every adapter in `NEWS_SOURCES` for the request's `sources` via `Promise.allSettled`, merges
   the fulfilled results, sorts by `publishedAt` descending, and collects the rejected ones into `sourceErrors`.
   Satisfies **AC-1**, **AC-3**, **AC-7**.
4. Wire both slices and the `newsApi` reducer/middleware into `src/app/store.ts`. Add `selectActivePreferences`
   and `selectActiveSearchParams` selectors.
5. Unit tests for the merge/sort/partial-failure logic in `searchArticles`'s `queryFn` (MSW, reusing the
   existing per-adapter test pattern) and for the preferences fallback-on-bad-data path. Covers the Critical
   test scenarios above.

## Consequences

**Positive**:
- Request caching and loading/error state come from RTK Query with no hand-written equivalent to keep in sync.
- Preferences and active search params stay independently testable, each in its own small slice.
- The merge/sort logic has one home (`searchArticles`'s `queryFn`), so the next (UI) slice only needs to call one hook.

**Negative / tradeoffs**:
- Same-page-number merging (AC-7) means the combined feed's page sizes vary slightly (e.g. Guardian page 2 might return 10 items while NewsAPI page 2 returns 20); there's no perfectly even "page 2 of the combined feed."
- `sourceErrors` only reports failures for sources that were actually requested; a source the user has deselected never appears there, which is correct but means a persistently broken key for a deselected source stays invisible until re-enabled.

**Neutral**:
- `localStorage` key `news-aggregator:preferences` is a new, project-specific storage key; worth keeping that name stable since a rename would strand existing users' saved preferences.

## Follow-up

- [ ] The search bar, filter controls (category chips, source toggles), and results list UI are a separate, later slice (`/architect` not needed there unless a new UI-only decision comes up; likely straight to `/develop`).
- [ ] If a future need arises to merge multiple categories' searches at once (rejected in this spec for complexity), revisit the "preferred categories" scope.
