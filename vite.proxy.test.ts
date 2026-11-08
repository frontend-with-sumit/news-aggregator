import { describe, expect, it } from 'vitest';
import { rewritePath } from './vite.proxy.ts';
import { PROVIDER_ROUTES } from './src/services/news/providerRoutes.ts';

describe('rewritePath', () => {
  it('appends the key as a query param and strips the base path', () => {
    const result = rewritePath(PROVIDER_ROUTES.guardian, 'secret', '/api/guardian/search?q=test');

    expect(result).toBe('/search?q=test&api-key=secret');
  });

  it('leaves the path untouched for a header-placed key, besides stripping the base path', () => {
    const result = rewritePath(PROVIDER_ROUTES.newsapi, 'secret', '/api/newsapi/top-headlines?category=science');

    expect(result).toBe('/top-headlines?category=science');
  });

  it('handles a path with no query string', () => {
    const result = rewritePath(PROVIDER_ROUTES.nyt, 'secret', '/api/nyt/search/v2/articlesearch.json');

    expect(result).toBe('/search/v2/articlesearch.json?api-key=secret');
  });
});
