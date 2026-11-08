# 0001. News provider API proxy architecture

**Date**: 2026-11-08
**Status**: Accepted

## Summary

This decides how the app talks to the three news providers (The Guardian, The New York Times, NewsAPI) without
putting their secret keys in the browser. The app uses a plain reverse proxy (a server that forwards requests
and quietly adds the key) instead of a custom backend. In development, Vite's own dev server does the
forwarding. In production, a single nginx container serves the built app and forwards provider requests the
same way. The `NewsSource` adapters keep shaping raw provider responses into `Article`s on the client, exactly
as already designed; only the network hop and the key change.

## Context

Each provider needs a secret key on every request (The Guardian and NYT as an `api-key` query parameter,
NewsAPI as an `apiKey` query parameter or `X-Api-Key` header). None of the three uses OAuth or request signing.
Browser code cannot hold these keys safely: anything shipped to the client, including a `VITE_`-prefixed env
var, ends up readable in the bundle or network tab. `.env.example` already names the three keys without a
`VITE_` prefix and notes they are meant to be read by "a server-side proxy (nginx / Vite dev proxy)," so some
server-side hop was already assumed before this spec; what was not yet decided is exactly what that hop does,
how it behaves in `npm run dev` versus the eventual Docker deployment the README still owes, and who injects
the key.

The existing `NewsSource` contract (`src/services/news/types.ts`) already puts response shaping (turning a
provider's JSON into an `Article`) on the client side, inside each adapter. That choice narrows this decision:
the server-side hop only needs to forward requests and attach the key, not understand or reshape provider
responses.

## Requirements

Not applicable. This is a decision-only architecture spec; it has no acceptance criteria or build plan of its
own (see `## Proposed stack` and `## Decision` below). The scaffolding work it unlocks (wiring the Vite proxy
config and the nginx container) is executed by whichever feature builds the provider adapters, derived from
this decision at that time.

## Options considered

### Option 1: Dumb reverse proxy (nginx in production, Vite's `server.proxy` in development)

A reverse proxy forwards each request from the browser to the real provider URL, injecting the key from a
server-side environment variable on the way through. It never looks at the response body. In `npm run dev`,
Vite's built-in `server.proxy` option does this inside the same process already running the dev server. In
production, a single nginx container serves the static build and reverse-proxies the same routes, with the key
substituted into its config from the container's environment at startup.

**Pros**:
- No new backend service to write, test, or deploy; the proxy is a few lines of config, not application code.
- Matches the intent already written into `.env.example` ("nginx / Vite dev proxy").
- nginx is a single, well understood container with a small, well known failure surface (it either forwards or it doesn't).

**Cons**:
- The browser still talks directly to provider-shaped responses (through the proxy); any provider response quirk is still handled client-side in the adapter, there's no server-side normalisation layer.
- Rate limiting or response caching, if ever needed, would have to be added to the proxy config later (nginx can do this, but it is not there by default).

### Option 2: Small backend API layer (Express/Fastify/Hono)

A small Node service owns all three provider calls itself and returns already-shaped `Article[]` JSON, so the
browser never sees a raw provider response.

**Pros**:
- Moves response shaping server-side; the client only ever sees the app's own `Article` shape.
- A natural place to add server-side caching, rate limiting, or merging results from multiple providers in one call.

**Cons**:
- A whole service to write, test, deploy, and keep running, for logic (shaping, which already lives in the adapters) that doesn't need to move.
- Duplicates the `NewsSource`/`Article` contract on both sides of the network unless the shaping code is deliberately shared, which is more design than this project currently needs.

### Option 3: Serverless functions (one per provider)

Each provider gets its own hosted function (e.g. on Vercel or Netlify) that injects the key and forwards the
request.

**Pros**:
- No server process to run or keep alive between requests.
- Scales to zero automatically.

**Cons**:
- Ties the deployment to a specific hosting platform's function runtime, in tension with the Docker-based deployment the README already plans.
- Cold starts and per-invocation limits add operational quirks for no benefit here, since there is no long-running or stateful work to isolate.

## Decision

**Chosen option**: Option 1: Dumb reverse proxy (nginx in production, Vite's `server.proxy` in development)

The app reaches all three providers through a same-origin reverse proxy that injects the provider key
server-side; adapters keep shaping responses on the client exactly as already designed.

## Rationale

The deciding force is that response shaping already lives client-side in the `NewsSource` adapters (`src/services/news/types.ts`), by design (dependency inversion: the UI depends on `Article`, not on any provider's shape). That one fact removes the main reason to run a real backend (Option 2): there is no shaping logic to move server-side, so a backend would only exist to hold three outbound `fetch` calls, which a reverse proxy already does with no application code. Option 3 (serverless functions) is rejected because it commits to a specific hosting platform's function runtime, while `.env.example`'s own wording ("nginx / Vite dev proxy") and the README's stated Docker plan both point at a container-based deployment instead; introducing a second deployment model for no functional gain is not worth it. Since all three providers authenticate with a plain query parameter or header (no OAuth, no signing), a proxy only has to add that one value per request, which nginx and Vite's dev proxy both do natively.

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Dev-time proxy | Vite `server.proxy`, configured with a per-provider `configure` hook that appends the key | Already the dev server in use; no extra process to run alongside it |
| Production proxy / server | Single nginx container, serving the static build and reverse-proxying the same routes | One image, matches the Docker direction the README already commits to; nginx's static-file and gzip handling come free |
| Secret injection | Environment variables read at container start, substituted into the nginx config via `envsubst` (the official nginx image's documented pattern) and read directly from `process.env` in `vite.config.ts` for dev | Keys never enter the client bundle; same three env var names already declared in `.env.example` |
| Client-side routing convention | Same-origin paths `/api/guardian/*`, `/api/nyt/*`, `/api/newsapi/*`, each rewritten to the matching provider host by the proxy | One naming convention shared by the Vite proxy config and the nginx config, so adapters call a relative path regardless of environment |

**Route-to-key mapping (settled now, so adapters have a fixed contract to call):**

| Client path prefix | Forwarded to | Key injected as |
|---|---|---|
| `/api/guardian/*` | `https://content.guardianapis.com/*` | `api-key` query parameter |
| `/api/nyt/*` | `https://api.nytimes.com/svc/*` | `api-key` query parameter |
| `/api/newsapi/*` | `https://newsapi.org/v2/*` | `X-Api-Key` header |

## Consequences

**Positive**:
- No backend service to build, test, or operate; the whole decision is configuration, not code.
- Dev and prod behave the same way from the adapter's point of view: a same-origin `/api/<provider>/*` call, proxy handles the rest.
- Keys never reach the browser, satisfying the constraint `.env.example` already stated.

**Negative / tradeoffs**:
- Any future need to cache responses, rate-limit calls, or merge/normalise data across providers server-side has no natural home yet; it would mean adding logic to the nginx layer (possible, but nginx config is a worse place for application logic than a small service) or revisiting this decision.
- Running the production proxy locally for parity testing means running nginx in Docker, not just `npm run dev`; the two dev paths (Vite proxy vs nginx) are similar but not identical, so a bug specific to nginx config (e.g. a bad `envsubst` substitution) won't show up until a Docker build.

**Neutral**:
- The three provider base URLs and path prefixes become a small shared config (route-to-key mapping above) that both `vite.config.ts` and the nginx config template must stay in sync with; worth keeping in one place referenced by both rather than duplicated.

## Follow-up

- [ ] When the Docker setup is built (the README still owes it), add the nginx config template and its `envsubst` entrypoint, and wire `vite.config.ts`'s `server.proxy` using the route-to-key mapping above.
- [ ] If a future feature needs response caching or rate-limit smoothing across the three providers' free-tier quotas, revisit this decision; nginx's `proxy_cache` is the first thing to reach for before introducing a backend service.

## References

**Project sources**:
- `.env.example`, the three key names and the "server-side proxy (nginx / Vite dev proxy)" comment
- `src/services/news/types.ts`, the `NewsSource` contract and its client-side response shaping

**Practices & standards**:
- Reverse proxy pattern for keeping secrets out of browser-delivered code (basis: never ship secrets in client-side bundles)
- `envsubst`-based config templating for container startup secrets (basis: the official nginx Docker image's documented environment-variable pattern)

**Links** (web verified only):
- [The Guardian Open Platform documentation](https://open-platform.theguardian.com/documentation/)
- [NYT Developer Network](https://developer.nytimes.com/)
- [NewsAPI documentation](https://newsapi.org/docs)
- [Vite server.proxy configuration](https://vite.dev/config/server-options.html#server-proxy)
- [nginx official Docker image, environment variable configuration](https://hub.docker.com/_/nginx)
