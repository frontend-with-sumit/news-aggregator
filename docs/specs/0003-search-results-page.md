# 0003. Search results page UI

**Date**: 2026-11-09
**Status**: Accepted

## Summary

This decides how the search results page looks and behaves: a header, a keyword search box, filter chips for
sources and categories, a results feed, and paging controls, all wired to the state layer spec 0002 already
built. It also adds a second page, an article detail view, reached by clicking a card. Since none of the three
news providers support looking an article up by id, the detail page carries the article's data with it when
you navigate there, rather than fetching it again.

## Context

Spec 0002 built the Redux state layer (preferences, the active search, and the merged `searchArticles` query)
but deliberately left the UI for a later slice. That UI does not exist yet: `App.tsx` is still a placeholder
heading, and nothing on screen lets a reader type a keyword, toggle a source or category, see the merged feed,
page through it, or recover from a partial provider failure.

The feed itself raises a few forces worth naming. The three providers return different page sizes and expose
no shared "total results" count, so there is no single reliable "page 12 of 40" figure across the merged feed.
None of the three support fetching one article by its id either, which matters once an article detail view is
in scope: a provider agnostic way to show "this one article" has to come from somewhere other than a lookup
call. Finally, the `Article` type's `imageUrl` is optional, so every card needs to handle a missing image
without a broken link or empty gap.

## Requirements

**User stories**:
- As a reader, I want to see my personalised feed as soon as I open the app, search by keyword, and toggle the
  sources and categories I care about, so I can read the news that matters to me without extra steps.
- As a reader, I want to know when a provider failed without losing the articles that did load, so a flaky key
  on one provider does not block my reading.
- As a reader, I want to open an article for a closer look and get back to the source easily, so I'm not stuck
  deciding whether to leave the app on every click.

**Acceptance criteria**:
- **AC-1**: Visiting `/` renders the header, search bar, filter chips, and a feed already populated from the
  reader's preferred sources and categories, with no empty "type something" state (carries spec 0002's AC-2
  into the UI).
- **AC-2**: Typing in the search box updates the active keyword and refetches after a short pause in typing
  (debounced), with no separate submit action needed.
- **AC-3**: Toggling a source or category chip updates the feed immediately (spec 0002's AC-4) and the chip's
  own visual state (active/inactive) reflects the toggle right away.
- **AC-4**: A chip for the one remaining selected source, or the one remaining selected category, renders
  visually disabled and cannot be toggled off (the state layer already rejects emptying either list).
- **AC-5**: While a search is in flight, the results area shows skeleton placeholder cards in place of the
  previous results, so the layout does not jump when real results arrive.
- **AC-6**: When a search returns zero articles, the results area shows a message suggesting the reader widen
  the search, not a blank area.
- **AC-7**: When one or more, but not all, selected sources fail, a dismissible banner lists each failed
  source with its error message, while the successful sources' articles still render below it.
- **AC-8**: Previous/Next controls page the feed. Previous is disabled on page 1; Next is disabled once the
  current page's merged result is empty (there is no reliable total count across providers to disable on
  otherwise).
- **AC-9**: Clicking an article card navigates to `/article/:id` and shows that article's title, image, summary,
  author, date, and source, plus a "Read full article" link that opens the original source URL in a new tab.
- **AC-10**: Visiting `/article/:id` directly (a refresh, or a pasted link) with no article data in hand shows a
  "go back to the feed" message instead of a broken or blank page, since the id alone cannot be resolved back
  to an article through any of the three providers.
- **AC-11**: An article with no `imageUrl` shows a placeholder image instead of a broken image icon or empty
  space.

## Options considered

### Option 1: React Router, article data passed via navigation state (recommended)

A `BrowserRouter` with two routes, `/` and `/article/:id`. Clicking a card calls `navigate` with the full
`Article` object as router state; the detail page reads it from `location.state`. A direct visit or refresh on
`/article/:id` has no state to read, so it shows the AC-10 fallback.

**Pros**:
- No new fetch logic, no per-provider "get by id" workaround; the data the list already loaded is reused as is.
- Small, standard React Router usage; nothing provider specific leaks into the routing layer.

**Cons**:
- A direct link or a refresh on the detail page loses the article; the reader has to go back through the feed.

### Option 2: No router; inline expand or modal on the same page

Clicking a card expands it in place or opens a modal with the same detail content, no navigation, no second
route.

**Pros**:
- No new dependency, no "lost on refresh" problem, since there is no second URL to refresh.

**Cons**:
- No shareable or bookmarkable URL for an article, and no clean place to grow a second real page later (the
  engineer wants a route-based detail page now, not a modal).

### Option 3: React Router, article cached in sessionStorage keyed by id

Same routing as Option 1, but every loaded article is also written to `sessionStorage` keyed by its id, so a
refresh on the detail page still resolves within the same browser session.

**Pros**:
- Survives a refresh or a same-tab back/forward within the session, unlike Option 1.

**Cons**:
- Extra bookkeeping on every search (write every result to storage), for a benefit (surviving a refresh) the
  engineer did not ask for; Option 1's simpler fallback message is an acceptable tradeoff for this app's size.

## Decision

**Chosen option**: Option 1: React Router, article data passed via navigation state

**Implementation skills**: `react-router-declarative-mode` (`remix-run/agent-skills`, `.agents/skills/react-router-declarative-mode/`)

## Rationale

None of the three provider APIs support fetching a single article by id, so any detail page needs its data
handed to it rather than looked up. Option 1 does that with the least new code: the list already has the full
`Article`, and passing it as navigation state costs nothing beyond the route itself. Option 3's session cache
would make a direct refresh survive, but that resilience was not asked for, and the extra write-on-every-search
bookkeeping is not worth it for a tradeoff the engineer explicitly accepted (a plain "go back to the feed"
message). Option 2 was ruled out directly: the engineer asked for a real second route, not a same-page modal,
and a route based detail page is also the cheaper foundation if more pages are added later.

## Feature design

**Data model sketch**: No new persisted entities. Reuses `Article`, `SourceId`, `Category` (spec 0001) and the
`preferences` / `searchParams` / `newsApi` state (spec 0002) as is. Two pieces of UI local state are new, both
component level, not Redux: the search box's in-flight (not yet debounced) text, and whether the error banner
has been dismissed for the current set of failures.

**State transitions**: not applicable (no entity lifecycle; `newsApi`'s own query states already cover
loading/success/error per spec 0002).

**Route / component surface**:
| Route / Component | Kind | Key inputs | Key outputs | Errors |
|---|---|---|---|---|
| `/` | route | n/a | renders `SearchResultsPage` | n/a |
| `/article/:id` | route | `:id` (URL encoded `Article.id`), `location.state.article?: Article` | renders `ArticleDetailPage` | no `state.article` → AC-10 fallback |
| `SearchBar` | component | types into a text input | debounced `setKeyword` dispatch | n/a |
| `FilterChips` | component | `preferences`, `SOURCE_IDS`/`CATEGORIES` | `toggleSource`/`toggleCategory` dispatch per chip; disabled state on the last remaining entry | n/a |
| `ArticleList` + `Pagination` | component | `useSearchArticlesQuery(searchParams)` | cards, skeletons, empty state; `setPage` dispatch | per-source errors to `StatusBanner`, see AC-7 |
| `StatusBanner` | component | `sourceErrors: SourceError[]` | one dismissible line per failed source | n/a |
| `ArticleCard` | component | one `Article` | navigates to `/article/<encoded id>` with the article as router state | n/a |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Render feed (AC-1, AC-5, AC-6) | the articles themselves | `newsApi.useSearchArticlesQuery(searchParams)`, decided in spec 0002 |
| Type to search (AC-2) | the active keyword | the search box's own input value, debounced ~400ms then dispatched via `searchParamsSlice.setKeyword` |
| Chip active state (AC-3) | whether a chip renders active | `preferences.preferredSources` / `preferredCategories` membership, decided in spec 0002 |
| Chip disabled state (AC-4) | whether a chip can be toggled off | `preferences.preferredSources.length === 1` (or `preferredCategories.length === 1`) while that entry is the selected one |
| Error banner lines (AC-7) | per-source failure messages | the query result's `sourceErrors`, decided in spec 0002 |
| Pagination disabled state (AC-8) | Previous/Next enabled or not | `searchParams.page === 1` (Previous); current page's `articles.length === 0` (Next) |
| Detail page content (AC-9) | the shown article | `location.state.article`, set by the card's `navigate` call |
| Detail fallback (AC-10) | the "go back" message | the absence of `location.state.article` |
| Missing image (AC-11) | the placeholder shown | a constructed `https://placehold.co/400x240?text=No+Image` URL, used whenever `article.imageUrl` is undefined |

**Key invariants**:
- A source or category chip is never rendered as toggleable off when it is the last one selected (mirrors the
  state layer's own invariant from spec 0002).
- `ArticleDetailPage` never issues a network request; it only reads `location.state`.
- Every `Article.id` is URL-encoded (`encodeURIComponent`) before it becomes the `:id` route segment, since ids
  contain `/` and `:` (e.g. `guardian:world/2026/nov/01/slug`).

**Security model**: not applicable; no authentication, all data is public news content, same as spec 0002.

**Configuration required**: none. `react-router-dom` is a new dependency but needs no credentials or env vars;
the placeholder image service (`placehold.co`) needs no key either.

**Critical test scenarios**:
- Happy path: load `/`, see the preference-seeded feed, toggle a category chip, see the feed refetch and the
  chip's active state flip, verifies **AC-1**, **AC-3**.
- Failure case: one source's query rejects while two succeed; the banner shows exactly one line and the other
  two sources' articles still render, verifies **AC-7**.
- Edge case: click an article card, land on `/article/:id` with its data shown; then visit that same URL fresh
  (no router state) and see the "go back to the feed" fallback instead of a crash, verifies **AC-9**, **AC-10**.

## Consequences

**Positive**:
- The detail page needs no new provider integration or per-source "fetch by id" workaround.
- The component inventory (`SearchBar`, `FilterChips`, `ArticleCard`, `ArticleList`, `Pagination`,
  `StatusBanner`) is small and each piece has one job, easy to test in isolation.
- Adding `react-router-dom` now, even for two routes, makes a third page (e.g. a settings page) a small addition
  rather than a later rework.

**Negative / tradeoffs**:
- A direct link or a refresh on `/article/:id` loses the article data (AC-10's accepted fallback); there is no
  shareable, reload-safe article URL in this design.
- The Next control cannot tell "last page" from "a page with no results for other reasons"; both look the same
  (empty page, Next disabled). Acceptable given the providers expose no shared total count (same tradeoff spec
  0002 already accepted for merged pagination).
- The ~400ms search debounce means the feed does not update on every keystroke, only after a short pause.

**Neutral**:
- `react-router-dom` is a new, project-wide dependency; the `react-router-declarative-mode` Agent Skill is
  installed to keep its usage to the declarative patterns this app's two-route size actually needs.

## Follow-up

- [ ] This project has no `AGENTS.md` yet (checked at `/architect` time, found missing). Worth creating one
  (`/audit`) so stack and conventions, including the newly installed `react-router-declarative-mode` skill, are
  recorded instead of re-inferred from scratch on every `/architect` or `/develop` run.
- [ ] If reload-safe or shareable article detail URLs become a real requirement later, revisit Option 3 (the
  `sessionStorage` cache) from this spec's Options considered.

## Build plan

1. Add `react-router-dom`; set up `BrowserRouter` with routes `/` (`SearchResultsPage`) and `/article/:id`
   (`ArticleDetailPage`) in `src/app`, replacing the current placeholder `App.tsx`. Satisfies **AC-1**, **AC-9**,
   **AC-10**.
2. Build the shared presentational pieces (`ArticleCard`, a skeleton version of it, `StatusBanner`) using
   `src/styles/tokens.css`, including the `placehold.co` image fallback. Satisfies **AC-5**, **AC-7**, **AC-11**.
3. Build `SearchBar` (debounced keyword input) and `FilterChips` (source/category toggle group with the
   last-one-disabled rule), wired to `searchParamsSlice`/`preferencesSlice`. Satisfies **AC-2**, **AC-3**,
   **AC-4**.
4. Build `ArticleList` and `Pagination` (Previous/Next), wired to `newsApi.useSearchArticlesQuery`. Satisfies
   **AC-1**, **AC-5**, **AC-6**, **AC-8**.
5. Compose `SearchResultsPage` (header, `SearchBar`, `FilterChips`, `StatusBanner`, `ArticleList`, `Pagination`).
   Satisfies **AC-1** through **AC-8**.
6. Build `ArticleDetailPage` reading `location.state.article`, with the AC-10 fallback and the external
   "Read full article" link. Satisfies **AC-9**, **AC-10**.
7. Component tests: debounced search, chip disabled state on the last entry, error banner rendering, pagination
   disabling, and the detail page's no-state fallback. Covers the Critical test scenarios above.
