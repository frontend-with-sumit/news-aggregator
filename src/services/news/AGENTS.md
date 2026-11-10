# src/services/news

## Overview

The framework-agnostic news provider layer. Wraps three external news APIs (The Guardian, NYT,
NewsAPI) behind one `NewsSource` interface, so the UI and Redux state only ever depend on
`Article`/`ArticleQuery`, never a provider's own response shape.

## Key files

| File | Owns |
|---|---|
| `types.ts` | Domain contract: `Article`, `ArticleQuery`, `NewsSource`, `SOURCE_IDS`/`CATEGORIES` |
| `index.ts` | Barrel: `NEWS_SOURCES` registry, re-exports types + `PROVIDER_ROUTES` |
| `providerRoutes.ts` | Maps each `SourceId` to its proxy `basePath`, upstream host, and where its key is injected |
| `shared.ts` | `fetchJson`, `buildQueryString`, `toCompactDate` helpers shared by all three adapters |
| `guardianSource.ts` / `nytSource.ts` / `newsApiSource.ts` | One adapter per provider, implementing `NewsSource.search()` |

## Conventions

- Import `Article`, `SourceId`, `Category`, etc. from the barrel `@/services/news`, never from
  `./types` directly.
- Every adapter maps `ArticleQuery.category` to that provider's own section/category vocabulary
  via a local `CATEGORY_TO_*` map; `'general'` always means "no category filter".
- Keyword search matches the article headline, not the full body (a deliberate product
  decision) — each adapter achieves this differently per provider capability; see Gotchas.
- API keys are never read client-side; `PROVIDER_ROUTES` + the proxy inject them server-side.
  Client code only ever calls the same-origin `/api/<source>/*` path.

## Gotchas

- **NYT's `fq` filter parameter does not work** against the live API (verified directly: even
  NYT's own documented `fq` examples return zero hits). Category and headline-only keyword
  matching for NYT are both done **client-side** after a plain `q` / `sort=newest` fetch — don't
  reintroduce `fq`-based filtering without re-verifying against the real API first.
- NYT serves `response.docs: null` (not `[]`) on zero results; `nytSource.ts` guards this, and
  the other two adapters guard their own result arrays the same way (`?? []`).
- NYT's `multimedia` field is an object (`{ default: { url }, thumbnail: { url } }` with
  already-absolute `static01.nyt.com` URLs), not the flat array of relative paths some
  third-party docs show.
- Guardian needs `query-fields=headline`, and NewsAPI needs `/everything?qInTitle=` (not
  `/top-headlines`, which has no title-only param) to get headline-only matching.
- All three providers rate-limit in practice (NYT's is notably tight). The search layer
  (`src/features/news/newsApi.ts`) fans out one request per `(source, category)` pair when
  multiple categories are selected, which multiplies request volume — see spec 0004.

## Related specs

- `docs/specs/0001-news-api-proxy-architecture.md`
- `docs/specs/0004-multi-category-search-grouping.md` (Assumed)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
