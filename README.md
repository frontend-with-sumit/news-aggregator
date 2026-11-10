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
  app/            store, providers, root component
  services/news/  framework-agnostic news layer (types, adapters)
  features/       articles, filters, preferences (added incrementally)
  components/ui/  shared presentational components
  lib/            small shared utilities
  styles/         design tokens and global styles
  test/           test setup and MSW handlers
```
