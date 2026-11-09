# 0003. Search results page UI — rationale

_Decision history for [index.md](./index.md). Not build input; see the index for the build spec._

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

## Rationale

None of the three provider APIs support fetching a single article by id, so any detail page needs its data
handed to it rather than looked up. Option 1 does that with the least new code: the list already has the full
`Article`, and passing it as navigation state costs nothing beyond the route itself. Option 3's session cache
would make a direct refresh survive, but that resilience was not asked for, and the extra write-on-every-search
bookkeeping is not worth it for a tradeoff the engineer explicitly accepted (a plain "go back to the feed"
message). Option 2 was ruled out directly: the engineer asked for a real second route, not a same-page modal,
and a route based detail page is also the cheaper foundation if more pages are added later.
