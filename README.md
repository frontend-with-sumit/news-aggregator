# News Aggregator

Frontend take-home: a news aggregator built with React 19 and TypeScript that pulls articles
from several providers (The Guardian, The New York Times, NewsAPI) into one searchable,
personalisable feed.

> Work in progress. Docker instructions, architecture notes and trade-offs will be added as the
> app is built.

## Requirements

- Node.js 22 (see `.nvmrc`) and npm

## Getting started

```bash
npm install
cp .env.example .env   # add your API keys (never commit .env)
npm run dev
```

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
