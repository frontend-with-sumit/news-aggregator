import { configureStore } from '@reduxjs/toolkit';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../test/server';
import { newsApi } from './newsApi';

function createTestStore() {
  return configureStore({
    reducer: { [newsApi.reducerPath]: newsApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(newsApi.middleware),
  });
}

describe('newsApi.searchArticles', () => {
  it('merges and sorts results from every selected source, newest first (AC-1)', async () => {
    server.use(
      http.get('/api/guardian/search', () =>
        HttpResponse.json({
          response: {
            results: [
              {
                id: 'world/older',
                webTitle: 'Guardian older',
                webUrl: 'https://theguardian.com/older',
                webPublicationDate: '2026-01-01T00:00:00Z',
                sectionId: 'world',
              },
            ],
          },
        }),
      ),
      http.get('/api/nyt/search/v2/articlesearch.json', () =>
        HttpResponse.json({
          response: {
            docs: [
              {
                _id: 'newer',
                headline: { main: 'Climate talks: NYT newer' },
                abstract: 'abstract',
                web_url: 'https://nytimes.com/newer',
                pub_date: '2026-06-01T00:00:00Z',
              },
            ],
          },
        }),
      ),
    );

    const store = createTestStore();
    const result = await store.dispatch(
      newsApi.endpoints.searchArticles.initiate({
        keyword: 'climate',
        categories: [],
        author: '',
        sources: ['guardian', 'nyt'],
        page: 1,
      }),
    );

    expect(result.data?.articles.map((article) => article.id)).toEqual([
      'nyt:newer',
      'guardian:world/older',
    ]);
    expect(result.data?.sourceErrors).toEqual([]);
  });

  it('reports a per-source error while still returning the other sources (AC-3)', async () => {
    server.use(
      http.get('/api/guardian/search', () => new HttpResponse(null, { status: 500 })),
      http.get('/api/nyt/search/v2/articlesearch.json', () =>
        HttpResponse.json({
          response: {
            docs: [
              {
                _id: 'ok',
                headline: { main: 'NYT ok' },
                abstract: 'abstract',
                web_url: 'https://nytimes.com/ok',
                pub_date: '2026-06-01T00:00:00Z',
              },
            ],
          },
        }),
      ),
    );

    const store = createTestStore();
    const result = await store.dispatch(
      newsApi.endpoints.searchArticles.initiate({
        keyword: '',
        categories: [],
        author: '',
        sources: ['guardian', 'nyt'],
        page: 1,
      }),
    );

    expect(result.data?.articles.map((article) => article.id)).toEqual(['nyt:ok']);
    expect(result.data?.sourceErrors).toHaveLength(1);
    expect(result.data?.sourceErrors[0]).toMatchObject({ source: 'guardian' });
    expect(result.data?.sourceErrors[0]?.message).toContain('500');
  });

  it('returns an error only when every selected source fails', async () => {
    server.use(http.get('/api/guardian/search', () => new HttpResponse(null, { status: 500 })));

    const store = createTestStore();
    const result = await store.dispatch(
      newsApi.endpoints.searchArticles.initiate({
        keyword: '',
        categories: [],
        author: '',
        sources: ['guardian'],
        page: 1,
      }),
    );

    expect(result.data).toBeUndefined();
    expect(result.error).toMatchObject({ message: 'All selected sources failed' });
  });

  it('forwards the requested page number to the adapter query (AC-7)', async () => {
    server.use(
      http.get('/api/guardian/search', ({ request }) => {
        expect(new URL(request.url).searchParams.get('page')).toBe('3');
        return HttpResponse.json({ response: { results: [] } });
      }),
    );

    const store = createTestStore();
    await store.dispatch(
      newsApi.endpoints.searchArticles.initiate({
        keyword: '',
        categories: [],
        author: '',
        sources: ['guardian'],
        page: 3,
      }),
    );
  });

  it("groups results by each article's own category, most-recently-selected category first, overriding date order (AC-2, AC-3)", async () => {
    let requestCount = 0;
    server.use(
      http.get('/api/guardian/search', ({ request }) => {
        requestCount += 1;
        expect(new URL(request.url).searchParams.get('section')).toBe('world|technology');
        return HttpResponse.json({
          response: {
            results: [
              {
                id: 'world/newer',
                webTitle: 'World, newer',
                webUrl: 'https://theguardian.com/world',
                webPublicationDate: '2026-06-01T00:00:00Z',
                sectionId: 'world',
              },
              {
                id: 'technology/older',
                webTitle: 'Technology, older',
                webUrl: 'https://theguardian.com/technology',
                webPublicationDate: '2026-01-01T00:00:00Z',
                sectionId: 'technology',
              },
            ],
          },
        });
      }),
    );

    const store = createTestStore();
    // 'world' was selected first, 'technology' second (most recent).
    const result = await store.dispatch(
      newsApi.endpoints.searchArticles.initiate({
        keyword: '',
        categories: ['world', 'technology'],
        author: '',
        sources: ['guardian'],
        page: 1,
      }),
    );

    // Guardian is asked once, with both sections joined (AC-5), not once per category.
    expect(requestCount).toBe(1);
    // The 'technology' group comes first even though its article is older, because
    // it was the more recently selected category.
    expect(result.data?.articles.map((article) => article.id)).toEqual([
      'guardian:technology/older',
      'guardian:world/newer',
    ]);
  });

  it('dedupes an article that surfaces under more than one selected category (AC-4)', async () => {
    server.use(
      http.get('/api/guardian/search', () =>
        HttpResponse.json({
          response: {
            results: [
              {
                id: 'shared/article',
                webTitle: 'Seen via world',
                webUrl: 'https://theguardian.com/shared',
                webPublicationDate: '2026-01-01T00:00:00Z',
                sectionId: 'world',
              },
            ],
          },
        }),
      ),
    );

    const store = createTestStore();
    // 'general' (no filter, catch-all) selected first, 'world' selected second (most recent).
    const result = await store.dispatch(
      newsApi.endpoints.searchArticles.initiate({
        keyword: '',
        categories: ['general', 'world'],
        author: '',
        sources: ['guardian'],
        page: 1,
      }),
    );

    expect(result.data?.articles).toHaveLength(1);
    expect(result.data?.articles[0]).toMatchObject({
      id: 'guardian:shared/article',
      title: 'Seen via world',
    });
  });

  it("the 'general' group catches every article not claimed by a more recently selected category (AC-1, AC-4)", async () => {
    server.use(
      http.get('/api/guardian/search', () =>
        HttpResponse.json({
          response: {
            results: [
              {
                id: 'business/article',
                webTitle: 'Business story',
                webUrl: 'https://theguardian.com/business',
                webPublicationDate: '2026-01-01T00:00:00Z',
                sectionId: 'business',
              },
              {
                id: 'science/article',
                webTitle: 'Science story',
                webUrl: 'https://theguardian.com/science',
                webPublicationDate: '2026-02-01T00:00:00Z',
                sectionId: 'science',
              },
            ],
          },
        }),
      ),
    );

    const store = createTestStore();
    // 'general' selected most recently; it must still surface the unrelated 'science'
    // article even though 'science' itself was never selected.
    const result = await store.dispatch(
      newsApi.endpoints.searchArticles.initiate({
        keyword: '',
        categories: ['business', 'general'],
        author: '',
        sources: ['guardian'],
        page: 1,
      }),
    );

    expect(result.data?.articles.map((article) => article.id)).toEqual([
      'guardian:science/article',
      'guardian:business/article',
    ]);
  });

  it('shows a distinct rate-limit message, not the raw status text, on a 429 (AC-9)', async () => {
    server.use(http.get('/api/guardian/search', () => new HttpResponse(null, { status: 429 })));

    const store = createTestStore();
    const result = await store.dispatch(
      newsApi.endpoints.searchArticles.initiate({
        keyword: '',
        categories: [],
        author: '',
        sources: ['guardian'],
        page: 1,
      }),
    );

    expect(result.error).toMatchObject({
      sourceErrors: [{ source: 'guardian', message: 'Temporarily rate limited, try again shortly.' }],
    });
  });
});
