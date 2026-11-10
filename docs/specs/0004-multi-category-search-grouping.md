# 0004 · Multi-category search grouping

**Status**: Assumed
**Date**: 2026-11-10
**Authorized by**: Sumit Kumar, during /develop

## Owed decision

Spec 0002 modeled `searchParams.category` as a single value — only the first preferred
category ever reached the providers, even though `preferences.preferredCategories` is a
multi-select list — and its merged-feed sort was a flat newest-first across all selected
sources. The engineer asked for toggling on a new category to actually broaden the
search (not just sit unused in preferences), with the newly-added category's results
appearing "at the beginning" of the feed. Neither spec 0002 nor spec 0003 defines:

- whether category selection should multi-select and merge like source selection
  already does
- how "new category's results first" should interact with the existing newest-first
  recency sort, and whether that ordering is a persistent rule or a one-time nudge

## Assumption built on

Resolved via a direct clarifying question to the engineer (not a full `/architect`
session). The chosen behavior:

- Category selection now behaves like source selection: search fans out one provider
  call per `(source, category)` pair across every selected category, merging the
  results instead of using only the first selected category.
- The merged feed is **grouped by category, most-recently-selected category first**
  (persistent grouping, not a one-time effect): each group is sorted newest-first
  internally. Toggling on another category moves its group to the front; toggling one
  off removes its group. This overrides spec 0002's flat global recency sort.
- Selection recency is read directly from `preferences.preferredCategories`'s existing
  append-on-toggle-on order (toggling a category back on moves it to the end of that
  array again) — no separate "last toggled" state was introduced.
- An article that would legitimately match more than one selected category (e.g. via
  the unfiltered `'general'` fetch overlapping a specific category) is deduped, kept
  only in its highest-priority (most-recently-selected) group.
- A source only counts as failed if every one of its per-category fetches failed; a
  failure for one selected category while another succeeds is tolerated silently
  (the `StatusBanner` contract from spec 0003 is unchanged: one line per fully-failed
  source).

## Code area

- `src/features/news/newsApi.ts` — fan-out per `(source, category)`, grouping, dedupe,
  source-failure rollup
- `src/features/search/searchParamsSlice.ts` — `category: Category | null` →
  `categories: Category[]`
- `src/features/preferences/preferencesSlice.ts` — unchanged; its existing
  append-on-toggle-on order is reused as the selection-recency signal

## Requirements

- Toggling on a category the reader doesn't already have selected broadens the search
  to include that category's articles, merged with the rest.
- That category's articles appear as a block ahead of every other selected category's
  articles, newest-first within the block.
- Toggling on another category afterward moves that one to the front instead.
- An article is never shown twice even if it would legitimately match more than one
  selected category.

## Ratify

This decision was recorded by `/develop`, not deliberated. Run `/architect multi
category search grouping` to deliberate and ratify it — in particular, whether fanning
out one provider call per `source x category` is an acceptable cost as more categories
are selected, and whether "grouped, not pure recency" is the sort behavior wanted long
term. Until then it stays flagged as an owed decision; it does not block this feature
being used.
