# 0004. Multi category search grouping and fan out: rationale

## Context

`/develop` shipped multi category search as an `Assumed` spec: the engineer answered a
direct clarifying question rather than going through a full design pass, and the
build fanned out one request per `(source, category)` pair across all three providers
uniformly, without checking whether each provider's API actually required that.

That assumption was tested in practice almost immediately: while separately debugging
an unrelated NYT crash, the New York Times API returned HTTP 429 (rate limited) under
normal manual testing with only a handful of categories selected. NYT's free tier
rate limit is tight, and the uniform fan out design multiplies every selected category
into its own NYT request, so the risk was real, not hypothetical.

Two things were genuinely undecided when the spec was recorded as `Assumed`:
whether the newest-selected-category-first grouping (overriding plain recency) is the
long term wanted behavior, and whether firing one request per `(source, category)` pair
is an acceptable cost as more categories get selected. Both needed a real pass rather
than an assumption, which is what this ratification does.

## Options considered

### Sort order: grouped by category vs flat recency vs a highlight strip

The shipped behavior groups the merged feed by category, most recently selected
category's articles first, each group sorted newest first internally. This was
re-examined against two alternatives: a flat global recency sort (drop grouping
entirely, merge everything newest first like sources already do), and a "highlight
strip" (pin just the newest two or three articles from the most recently toggled
category above an otherwise flat recency feed, a smaller visual nudge rather than a
full regroup).

The engineer confirmed the shipped grouped behavior is what was actually wanted; it
directly answers the original ask ("show the new category's results at the beginning")
in a way flat recency does not, and a highlight strip would under deliver on that same
ask while adding its own bookkeeping (tracking a "just toggled" transient state). No
change made here; recorded for completeness since this was one of the two things the
spec was built `Assumed` on.

### Fan out: one option per provider's actual capability, weighed together

**Option 1: Per provider fan out, matched to what each provider's API can do
(chosen).** Verified live against all three provider APIs rather than assumed:
Guardian's `section` parameter accepts several sections joined with `|` in one request
(confirmed: a combined query for two sections returned articles correctly tagged with
both). NewsAPI's `category` parameter is confirmed single value only (a comma separated
value silently returned zero results, no error). NYT's category matching was already
client side, a consequence of `fq` not working at all against the live API (see
`src/services/news/AGENTS.md`), so it never needed more than one request regardless of
category count, it just hadn't been corrected to only make one.

**Pros**:
- Removes the fan out multiplier entirely for two of the three providers, including the
  one that actually hit a rate limit.
- Each provider's request count now matches what its API genuinely requires, not a
  uniform assumption that happened to be wrong for two of three providers.
- Grouping by each article's own `category` field (made possible once Guardian/NYT can
  return several categories in one response) is simpler code than today's
  per-request-category tagging, not just a cost fix.

**Cons**:
- Three different fan out strategies (one request, one request, capped-with-fallback)
  is more to hold in your head than one uniform rule.
- NewsAPI still cannot avoid per-category requests below its cap, so the fix is partial
  for that provider.

**Option 2: Keep uniform fan out for all three providers, add a cap or backoff
instead.** Leave every provider on "one request per selected category", and either cap
the total number of simultaneously selected categories project-wide, or add rate-limit
aware retry/backoff.

**Pros**:
- One rule for all three providers, simpler to reason about.
- No per-provider request construction changes needed.

**Cons**:
- Throws away a real capability Guardian already has (combining sections in one
  request) for the sake of uniformity, not because it's actually a limitation of that
  provider.
- A project-wide cap would unnecessarily restrict Guardian and NYT, which do not need
  one, to accommodate NewsAPI's narrower limit.
- Backoff/retry alone doesn't reduce request volume, just makes the eventual failure
  softer; it doesn't address the root cause the NYT 429 actually exposed.

**Option 3: Move all category filtering client side, uniformly, for all three
providers.** Fetch each provider once per search with no category filter at all, then
filter the merged results by category client side, extending the pattern already used
for NYT.

**Pros**:
- Simplest possible request shape: exactly one request per source, full stop.
- Reuses a pattern already proven for NYT.

**Cons**:
- NewsAPI returns no real per-article category field at all (categories are only ever
  stamped onto its results by whichever request fetched them); an unfiltered NewsAPI
  fetch has no honest way to know which category each article actually belongs to, so
  this option cannot preserve NewsAPI's existing precision, it can only degrade it.
- Guardian's section filter genuinely works server side and is more precise than
  reconstructing category membership from an unfiltered feed; dropping it to match
  NYT's workaround trades away real, working precision to copy a fix that exists only
  because NYT's API is broken, not because client side filtering is better in general.

## Rationale

Option 1 was chosen because it is the only option that responds to what was actually
verified about each provider rather than assuming they are interchangeable. The forces
from Context point directly here: the concrete failure was NYT rate limiting under a
uniform fan out design, and the live verification showed that design was penalizing
Guardian and NYT for a limitation only NewsAPI actually has. Option 2's uniform cap or
backoff treats the symptom (too many requests) without correcting the premise that
caused it (assuming every provider needs one request per category). Option 3 overreaches
in the other direction: it would fix NewsAPI's situation (already handled by Option 1's
cap and fallback) by discarding Guardian's genuinely working, more precise server side
filtering, which Option 1 keeps.

The NewsAPI cap of 3 is a RECOMMEND item (not asked as an open ended number): NewsAPI's
free tier daily limit is the tightest of the three providers by a wide margin, so
keeping its worst case fan out in the same order of magnitude as Guardian/NYT's new
baseline of one request is the right default; it is a plain constant, not a tuned
figure, and the spec's Follow-up section flags it for revisiting once real usage is
observed.
