import type { ProxyOptions } from 'vite';
import { PROVIDER_ROUTES, type ProviderRoute } from './src/services/news/providerRoutes.ts';

/**
 * Builds the dev-time equivalent of the production nginx reverse proxy
 * (docs/specs/0001-news-api-proxy-architecture.md): each provider's base path is
 * forwarded to its real host, with the secret key injected server side so it never
 * reaches the browser.
 */
export function createProviderProxy(env: NodeJS.ProcessEnv): Record<string, ProxyOptions> {
  const proxy: Record<string, ProxyOptions> = {};
  for (const route of Object.values(PROVIDER_ROUTES)) {
    proxy[route.basePath] = buildProxyEntry(route, env[route.apiKeyEnvVar] ?? '');
  }
  return proxy;
}

function buildProxyEntry(route: ProviderRoute, apiKey: string): ProxyOptions {
  const headerPlacement = route.apiKeyPlacement.type === 'header' ? route.apiKeyPlacement : undefined;
  return {
    target: route.upstream,
    changeOrigin: true,
    rewrite: (path) => rewritePath(route, apiKey, path),
    configure(proxyServer) {
      if (!headerPlacement) return;
      proxyServer.on('proxyReq', (proxyReq) => {
        proxyReq.setHeader(headerPlacement.name, apiKey);
      });
    },
  };
}

/** Strips the base path and, for a query-placed key, appends it. Exported for testing. */
export function rewritePath(route: ProviderRoute, apiKey: string, path: string): string {
  const [pathname, search] = path.split('?');
  const params = new URLSearchParams(search);
  if (route.apiKeyPlacement.type === 'query') {
    params.set(route.apiKeyPlacement.param, apiKey);
  }
  const strippedPath = pathname.replace(route.basePath, '');
  const query = params.toString();
  return query ? `${strippedPath}?${query}` : strippedPath;
}
