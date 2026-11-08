import type { SourceId } from './types.ts';

/**
 * Single source of truth for how each provider is reached through the reverse proxy
 * (see docs/specs/0001-news-api-proxy-architecture.md). The client only ever knows
 * `basePath`; the proxy (Vite dev server, nginx in production) uses the rest to
 * forward the request and inject the key server side.
 */
export interface ProviderRoute {
  /** Same-origin path prefix the client calls; the proxy strips it before forwarding. */
  basePath: string;
  /** Upstream host the proxy forwards to, with no trailing slash. */
  upstream: string;
  /** Env var holding this provider's secret key (read server side only, never bundled). */
  apiKeyEnvVar: string;
  /** How the proxy attaches the key to the forwarded request. */
  apiKeyPlacement: { type: 'query'; param: string } | { type: 'header'; name: string };
}

export const PROVIDER_ROUTES: Record<SourceId, ProviderRoute> = {
  guardian: {
    basePath: '/api/guardian',
    upstream: 'https://content.guardianapis.com',
    apiKeyEnvVar: 'GUARDIAN_API_KEY',
    apiKeyPlacement: { type: 'query', param: 'api-key' },
  },
  nyt: {
    basePath: '/api/nyt',
    upstream: 'https://api.nytimes.com/svc',
    apiKeyEnvVar: 'NYT_API_KEY',
    apiKeyPlacement: { type: 'query', param: 'api-key' },
  },
  newsapi: {
    basePath: '/api/newsapi',
    upstream: 'https://newsapi.org/v2',
    apiKeyEnvVar: 'NEWSAPI_API_KEY',
    apiKeyPlacement: { type: 'header', name: 'X-Api-Key' },
  },
};
