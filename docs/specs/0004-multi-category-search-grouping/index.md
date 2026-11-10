# 0004. Multi category search grouping and fan out

**Date**: 2026-11-10
**Status**: Accepted

_Reasoning and options: see [rationale.md](./rationale.md)._

## Summary

This decides two things: how the merged feed orders articles when several categories
are selected, and how many network requests that costs. The ordering (newest selected
category's articles first) stays as already shipped. The request cost changes: Guardian
and the New York Times (NYT) can each be asked for every selected category in a single
request, so they no longer fire one request per category. NewsAPI's API genuinely
cannot do that, so it keeps one request per category, but only up to 3 at once; beyond
that it falls back to a single broader request instead of growing without bound.

## Requirements

**User stories**:
- As a reader, I want toggling on a new category to broaden what I see, with that
  category's picks up front, so I notice the new coverage right away.
- As a reader selecting several categories at once, I want the app to stay responsive
  and not get rate limited by a news provider, so my search keeps working.

**Acceptance criteria**:
- **AC-1**: Toggling on a category not already selected broadens the search to include
  that category's articles, merged with the rest.
- **AC-2**: The most recently selected category's articles appear as a block ahead of
  every other selected category's articles, newest first within the block.
- **AC-3**: Toggling on another category afterward moves that one to the front instead.
- **AC-4**: An article is never shown twice even if it would legitimately match more
  than one selected category.
- **AC-5**: Guardian issues exactly one request per search regardless of how many
  categories are selected.
- **AC-6**: NYT issues exactly one request per search regardless of how many categories
  are selected.
- **AC-7**: NewsAPI issues at most 3 requests per search when 3 or fewer categories are
  selected; beyond 3 selected categories it issues one broader, unfiltered request
  instead of one per category.
- **AC-8**: NewsAPI's broader fallback results are folded into the most recently
  selected category's group, not dropped and not shown as their own group.
- **AC-9**: A request that fails specifically from rate limiting (HTTP 429) shows a
  distinct "temporarily rate limited, try again shortly" message in the status banner,
  not the raw status code text.

## Decision

**Chosen option**: Option 1: per provider fan out, matched to what each provider's API
can actually do.

Guardian and NYT each collapse every selected category into one request (Guardian via
its native multi section query, NYT by filtering its own single unfiltered response
client side); NewsAPI keeps one request per category, capped at 3, falling back to one
unfiltered request beyond that.

## Rationale

See [rationale.md](./rationale.md) for the full reasoning and the options weighed.

## Feature design

**Data model sketch**: No persisted entities change. `ArticleQuery.category?: Category`
becomes `ArticleQuery.categories?: Category[]` (`src/services/news/types.ts`); every
adapter and the orchestrator read the plural field. `'general'` in the list still means
"no filter", and takes priority: if `'general'` is among the selected categories, a
provider sends no category filter at all (since general's results already are a
superset of every specific category's).

**State transitions**: not applicable.

**API surface**: internal only (no public endpoint). The call shape change is:

| Caller | Before | After |
|---|---|---|
| `newsApi.ts` → Guardian | one call per selected category | one call, `categories` joined into Guardian's `section=a\|b\|c` syntax |
| `newsApi.ts` → NYT | one call per selected category (even though matching was already client side) | one call with no category filter; all selected categories matched client side against that one response |
| `newsApi.ts` → NewsAPI | one call per selected category, unbounded | one call per selected category, capped at 3; beyond the cap, one unfiltered call instead |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Merge and group the feed | which category group an article belongs to | the article's own `category` field, as already stamped by each adapter's `toArticle` (Guardian/NYT: the provider's real section; NewsAPI: the category that request targeted, or, for its fallback batch, the last entry of `query.categories`) |
| Order the groups | which group renders first | `preferences.preferredCategories`'s existing selection order order, reversed (most recent first), unchanged from the shipped behavior |
| NewsAPI fallback's category tag | which category its unfiltered batch is stamped with | `query.categories`'s own last entry; this array preserves the oldest to newest selection order end to end (from `searchParamsSlice` through `SearchArticlesArgs` into `ArticleQuery`), so "last entry" always means "most recently selected" with no separate field needed |
| Rate limit message | the wording shown | a fixed string, triggered when an adapter's fetch fails with HTTP 429, detected in each adapter's existing catch path |

**Key invariants**:
- `'general'` in the selected categories always means "send no category filter" for
  every provider; it is never joined alongside specific sections.
- Grouping keys off each returned article's own `category` field, never the category a
  request was made for. This is already true for NewsAPI (forced, since it has no real
  per-article category) and becomes true for Guardian/NYT too, since one response can
  now legitimately contain several categories' articles. `FetchResult.category` (the
  internal per-fetch record in `newsApi.ts`) is kept only for per-source error
  bucketing; grouping never reads it.
- **`'general'`'s group is a catch-all, not an exact-match filter.** Since Guardian/NYT
  now return every section's articles whenever `'general'` is selected (not articles
  literally tagged `'general'`), grouping by exact `category` equality would silently
  drop any article whose real category isn't one of the other selected categories (e.g.
  a `'science'`-tagged article when only `['general', 'business']` are selected). When
  `'general'` is among the selected categories, its group instead claims every article
  not already claimed by a higher-priority (more recently selected) group, regardless
  of that article's own category. This is what makes "no filter" actually mean
  everything, as the spec's own premise requires.
- A source's failure state is now literally "its one (or, for NewsAPI, its up-to-3)
  request(s) failed", not a separate per-category partial state; Guardian and NYT can no
  longer fail for one selected category while succeeding for another, since they only
  ever make one request.

**Security model**: not applicable, unchanged from spec 0001/0002.

**Configuration required**: none. The NewsAPI cap (3) is a code constant, not an env var.

**Critical test scenarios**:
- Happy path: select 3 categories including Guardian coverage; confirm Guardian's
  request includes all 3 joined and returns articles from each, verifies **AC-1**,
  **AC-5**.
- Failure case: a request returns HTTP 429; confirm the status banner shows the
  rate limit specific message, not the raw error text, verifies **AC-9**.
- Edge case: select 5 categories (above the NewsAPI cap of 3); confirm NewsAPI fires one
  unfiltered request instead of 5, and its results appear folded into the most recently
  selected category's group, verifies **AC-7**, **AC-8**.
- Edge case: select `['general', 'business']`; confirm an article genuinely tagged
  `'science'` by Guardian/NYT still appears (in the `'general'` catch-all group), rather
  than being silently dropped for matching neither selected category exactly, verifies
  **AC-1**, **AC-4**.

## Build plan

1. Change `ArticleQuery.category?: Category` to `categories?: Category[]` in
   `src/services/news/types.ts`; `'general'` present anywhere in the list means no
   filter. Satisfies **AC-5**, **AC-6**, **AC-7** (shared prerequisite).
2. Update `guardianSource.ts` to join the mapped sections of `query.categories` with
   `|` into one `section` param (or omit `section` entirely when `'general'` is
   present), replacing the orchestrator's per category loop for this source. Satisfies
   **AC-5**.
3. Update `nytSource.ts` to fetch once with no section filter, then keep its existing
   client side filtering but check membership against the full `query.categories` list
   instead of a single category. Satisfies **AC-6**.
4. Update `newsApiSource.ts`: when asked for more than 3 categories, make one fallback
   `/everything` call that **omits `qInTitle` entirely** when there's no keyword
   (the existing `qInTitle: query.keyword || category` default would otherwise search
   for the literal word "general", defeating the point of an unfiltered call). Tag the
   fallback's results with `query.categories`'s own last entry (self-derived, no new
   field needed, per the Value sourcing row above) instead of one call per category.
   Satisfies **AC-7**, **AC-8**. Does not depend on step 5.
5. Rework `src/features/news/newsApi.ts`'s fan out loop: call Guardian and NYT once each
   with the full category list; call NewsAPI per the capped/fallback rule above.
   `FetchResult.category` stays for per-source error bucketing only. Change the grouping
   step to key off each returned article's own `category` field, with `'general'`
   implemented as the catch-all described in Key invariants (claims every
   not-yet-claimed article, not just those tagged `'general'`). Keep the existing
   dedupe-by-id. Satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-8**.
6. Detect HTTP 429 specifically in each adapter's existing error handling (or the shared
   `fetchJson` helper) and surface the dedicated rate limit message through
   `SourceError.message`. Satisfies **AC-9**.
7. Update `guardianSource.test.ts`, `nytSource.test.ts`, `newsApiSource.test.ts`, and
   `newsApi.test.ts` for the new request shapes, the cap/fallback behavior, the
   article-level grouping, and the 429 message. Covers all of the above.

## Consequences

**Positive**:
- Guardian and NYT drop from "one request per selected category" to exactly one
  request each, removing nearly all of the rate limit risk this spec originally
  flagged as an open question.
- Grouping by each article's own `category` field is simpler than the current
  per-request-category tagging, and more accurate for Guardian/NYT (an article is
  grouped by what it actually is, not by which request happened to return it).
- A reader hitting a rate limit now gets an actionable, honest message instead of a raw
  status code string.

**Negative / tradeoffs**:
- NewsAPI still cannot avoid one request per category below its cap of 3; a reader who
  mostly cares about NewsAPI coverage across many categories still pays that cost, just
  bounded.
- Beyond the cap, NewsAPI's contribution loses per-category precision (one unfiltered
  batch stamped with a single category), a deliberate, visible tradeoff rather than a
  silent one.
- Guardian and NYT can no longer partially fail (one selected category failing while
  another succeeds); a failure now always takes down that source's whole contribution
  for the search. This is a simplification, not expected to be noticeable in practice,
  since the UI never surfaced that partial state visually anyway.
- Guardian's combined request returns one page of results spanning every selected
  section rather than one full page per section, so per-category depth on later pages
  is shallower than today's (buggy but deeper) per-category pagination.

**Neutral**:
- The NewsAPI cap (3) is a plain code constant; revisit it if real usage shows readers
  commonly select more categories than that.

## Follow-up

- [ ] If real usage shows most readers select more than 3 categories at once, revisit
  the NewsAPI cap or consider whether NewsAPI's contribution should be dropped from the
  grouped view entirely above the cap, rather than folded in imprecisely.
