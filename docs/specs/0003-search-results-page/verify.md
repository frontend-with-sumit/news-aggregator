# Verify: search results page UI · spec 0003 · updated 2026-11-09

_Steps derived from spec 0003 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Visit `/` with a fresh browser profile (no stored preferences) → see the header, search bar, filter chips,
      and a feed already populated (no empty "type something" state) → AC-1
- [ ] Type a keyword, wait less than 400ms, confirm the feed has not refetched yet; wait past 400ms, confirm it
      refetches with no separate submit action → AC-2
- [ ] Toggle a source or category chip (not the last one) → the feed refetches and the chip's own active/inactive
      style flips immediately → AC-3
- [ ] Reduce preferred sources (or categories) down to one, then try to toggle that last one off → the chip renders
      visually disabled and the click has no effect → AC-4
- [ ] While a search is in flight (e.g. right after changing the keyword), observe skeleton placeholder cards in
      place of the previous results, with no layout jump → AC-5
- [ ] Search a keyword that matches nothing across all sources → the results area shows a "widen your search"
      message, not a blank area → AC-6
- [ ] Force one selected source to fail (e.g. break its proxy route) while the other two succeed → a dismissible
      banner lists exactly the failed source and its message, while the other sources' articles still render below
      it; dismissing the banner hides it → AC-7
- [ ] On page 1, confirm Previous is disabled; page forward until a page returns zero merged articles, confirm Next
      is disabled on that page → AC-8
- [ ] Click an article card → land on `/article/:id` showing that article's title, image, summary, author, date,
      and source, plus a "Read full article" link that opens the original URL in a new tab → AC-9
- [ ] Copy the `/article/:id` URL from the step above and open it directly in a fresh tab (no router state) → see
      the "go back to the feed" message instead of a broken or blank page → AC-10
- [ ] Find (or temporarily fake) an article with no `imageUrl` → its card and its detail page both show the
      placeholder image, not a broken image icon or empty gap → AC-11

## Commands

- [ ] `npm run typecheck` → passes with no errors
- [ ] `npm run lint` → passes with no errors
- [ ] `npm run test` → all component tests pass, including: `SearchBar.test.tsx` (debounce), `FilterChips.test.tsx`
      (last-entry disabled), `StatusBanner.test.tsx` (per-source error lines + dismiss), `Pagination.test.tsx`
      (Previous/Next disabling), `ArticleDetailPage.test.tsx` (no-state fallback)
- [ ] `npm run build` → production build succeeds

## Value sourcing coverage

- [ ] Feed render: confirm articles shown match `useSearchArticlesQuery(searchParams)` data, not a stale or
      hardcoded list → AC-1, AC-5, AC-6
- [ ] Keyword: confirm the dispatched keyword exactly matches the debounced input text, including after clearing it
      back to empty → AC-2
- [ ] Chip active state: confirm a chip's active style tracks `preferences.preferredSources` /
      `preferredCategories` membership, not local component state → AC-3
- [ ] Chip disabled state: confirm disabling triggers only when that entry is both selected AND the sole remaining
      entry in its list (toggling a second-to-last entry off should still be allowed) → AC-4
- [ ] Error banner: confirm lines come from `data.sourceErrors` (partial failure) and also render correctly from
      the top-level `error.sourceErrors` case (all selected sources fail) → AC-7
- [ ] Pagination: confirm Next's disabled state is driven by the current page's `articles.length === 0`, not a
      fixed page count → AC-8
- [ ] Detail page: confirm the shown article is exactly `location.state.article` with no re-fetch, for an article
      from each of the three sources (field shapes can differ slightly per adapter) → AC-9
- [ ] Missing image: confirm the placeholder URL is used only when `imageUrl` is `undefined`, not for a falsy but
      present value → AC-11

## Acceptance-criteria coverage

- AC-1 … covered by the first UI step and the feed-render value-sourcing step
- AC-2 … covered by the debounce UI step, the keyword value-sourcing step, and `SearchBar.test.tsx`
- AC-3 … covered by the chip toggle UI step and the chip-active-state value-sourcing step
- AC-4 … covered by the last-chip UI step, the chip-disabled value-sourcing step, and `FilterChips.test.tsx`
- AC-5 … covered by the skeleton UI step and the feed-render value-sourcing step
- AC-6 … covered by the zero-results UI step and the feed-render value-sourcing step
- AC-7 … covered by the partial-failure UI step, the error-banner value-sourcing step, and `StatusBanner.test.tsx`
- AC-8 … covered by the pagination UI step, the pagination value-sourcing step, and `Pagination.test.tsx`
- AC-9 … covered by the card-click UI step and the detail-page value-sourcing step
- AC-10 … covered by the direct-link UI step and `ArticleDetailPage.test.tsx`
- AC-11 … covered by the missing-image UI step and the missing-image value-sourcing step
