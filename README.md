# News Aggregator

Frontend take-home: a news aggregator built with React 19 and TypeScript that pulls articles
from several providers (The Guardian, The New York Times, NewsAPI) into one searchable,
personalisable feed.

## Requirements

- Node.js 26 (see `.nvmrc`) and npm, **or** Docker, depending on which path below you follow.

## Getting started

```bash
npm install
cp .env.example .env   # add your API keys (never commit .env)
npm run dev
```

## Running with Docker

A single nginx container serves the production build and reverse-proxies the three provider
APIs, injecting each one's key server-side so it never reaches the browser (see
`docs/specs/0001-news-api-proxy-architecture.md`).

```bash
cp .env.example .env   # add your API keys (never commit .env)
docker compose up --build
```

The app is then available at [http://localhost:8080](http://localhost:8080).

Without Compose:

```bash
docker build -t news-aggregator .
docker run --rm -p 8080:80 --env-file .env news-aggregator
```

The three env vars (`GUARDIAN_API_KEY`, `NYT_API_KEY`, `NEWSAPI_API_KEY`) are read by nginx at
container start (via `envsubst`, templated from `docker/nginx/default.conf.template`) and are
never baked into the image or the client bundle.

## Scripts

| Script                  | Purpose                            |
| ----------------------- | ---------------------------------- |
| `npm run dev`           | Start the Vite dev server          |
| `npm run build`         | Typecheck and build for production |
| `npm run typecheck`     | Strict TypeScript check            |
| `npm run lint`          | ESLint (type-aware rules)          |
| `npm run format:check`  | Verify Prettier formatting         |
| `npm test`              | Run unit/component tests (Vitest)  |
| `npm run test:coverage` | Tests with coverage                |

## Project layout

```text
src/
  app/              Redux store, providers, root component, theme toggle
  services/news/    framework-agnostic news layer: Article/ArticleQuery contract,
                     one adapter per provider (Guardian/NYT/NewsAPI), the dev proxy's
                     route-to-key mapping
  features/
    news/            the merged, multi-provider search query (RTK Query)
    preferences/      persisted user preferences (sources, categories, author)
    search/           active search state + every results-screen UI component
  styles/            design tokens (light/dark) and global styles
  test/              Vitest setup, renderWithProviders, MSW handlers
```

## Architecture

- **Provider adapters** (`src/services/news/`): each provider (Guardian, NYT, NewsAPI)
  is wrapped behind one shared `NewsSource` interface. UI and Redux state depend only on
  `Article`/`ArticleQuery`, never on a provider's own response shape — adding a fourth
  provider means writing one new adapter, not touching any existing code
  (dependency inversion / open-closed). See `src/services/news/AGENTS.md`.
- **Multi-category search fan-out**: Guardian and NYT can each take every selected
  category in a single request; NewsAPI genuinely needs one request per category
  (capped at 3, with a broader fallback beyond that) — each provider is asked for
  only what its real API actually supports, not a uniform assumption. Full
  reasoning and the options weighed: `docs/specs/0004-multi-category-search-grouping/`.
- **Provider keys stay server-side**: the client only ever calls a same-origin
  `/api/<provider>/*` path; a reverse proxy injects the real key and forwards the
  request — Vite's `server.proxy` in dev, a single nginx container in production
  (see "Running with Docker" above). Decision and options weighed:
  `docs/specs/0001-news-api-proxy-architecture.md`.
- **State**: one Redux Toolkit slice per domain (`preferences`, `searchParams`) plus
  `newsApi` as an RTK Query endpoint that fans out to the three adapters, merges,
  dedupes, and groups the results.
