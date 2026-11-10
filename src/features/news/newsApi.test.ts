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

  it('groups results by category, most-recently-selected category first, overriding date order', async () => {
    server.use(
      http.get('/api/guardian/search', ({ request }) => {
        const section = new URL(request.url).searchParams.get('section');
        if (section === 'world') {
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
              ],
            },
          });
        }
        return HttpResponse.json({
          response: {
            results: [
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

    // The 'technology' group comes first even though its article is older, because
    // it was the more recently selected category.
    expect(result.data?.articles.map((article) => article.id)).toEqual([
      'guardian:technology/older',
      'guardian:world/newer',
    ]);
  });

  it('dedupes an article that surfaces under more than one selected category', async () => {
    server.use(
      http.get('/api/guardian/search', ({ request }) => {
        const section = new URL(request.url).searchParams.get('section');
        return HttpResponse.json({
          response: {
            results: [
              {
                id: 'shared/article',
                webTitle: section === 'world' ? 'Seen via world' : 'Seen via general',
                webUrl: 'https://theguardian.com/shared',
                webPublicationDate: '2026-01-01T00:00:00Z',
                sectionId: 'world',
              },
            ],
          },
        });
      }),
    );

    const store = createTestStore();
    // 'general' (no section filter) selected first, 'world' selected second (most recent).
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
});
