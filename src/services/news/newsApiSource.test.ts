import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../test/server';
import { newsApiSource } from './newsApiSource';

describe('newsApiSource', () => {
  it('uses top-headlines when a single category is given with no date range', async () => {
    server.use(
      http.get('/api/newsapi/top-headlines', ({ request }) => {
        expect(new URL(request.url).searchParams.get('category')).toBe('science');
        return HttpResponse.json({
          articles: [
            {
              source: { id: 'wired', name: 'Wired' },
              author: 'A Writer',
              title: 'A title',
              description: 'A description',
              url: 'https://example.com/1',
              urlToImage: 'https://img',
              publishedAt: '2026-11-01T00:00:00Z',
            },
          ],
        });
      }),
    );

    const articles = await newsApiSource.search(
      { categories: ['science'], page: 1 },
      new AbortController().signal,
    );

    expect(articles).toEqual([
      {
        id: 'newsapi:https://example.com/1',
        title: 'A title',
        summary: 'A description',
        url: 'https://example.com/1',
        imageUrl: 'https://img',
        author: 'A Writer',
        publishedAt: '2026-11-01T00:00:00Z',
        source: 'newsapi',
        category: 'science',
      },
    ]);
  });

  it('falls back to /everything when a date range is given', async () => {
    server.use(
      http.get('/api/newsapi/everything', ({ request }) => {
        expect(new URL(request.url).searchParams.get('from')).toBe('2026-01-01');
        return HttpResponse.json({ articles: [] });
      }),
    );

    await newsApiSource.search(
      { categories: ['science'], from: '2026-01-01', page: 1 },
      new AbortController().signal,
    );
  });

  it('matches a keyword against the headline via /everything, even with a category and no date range', async () => {
    server.use(
      http.get('/api/newsapi/everything', ({ request }) => {
        const params = new URL(request.url).searchParams;
        expect(params.get('qInTitle')).toBe('climate');
        expect(params.get('q')).toBeNull();
        return HttpResponse.json({ articles: [] });
      }),
    );

    await newsApiSource.search(
      { keyword: 'climate', categories: ['science'], page: 1 },
      new AbortController().signal,
    );
  });

  it('issues one request per selected category when 3 or fewer are selected (AC-7)', async () => {
    const requestedCategories: string[] = [];
    server.use(
      http.get('/api/newsapi/top-headlines', ({ request }) => {
        const category = new URL(request.url).searchParams.get('category');
        requestedCategories.push(category ?? '');
        return HttpResponse.json({ articles: [] });
      }),
    );

    await newsApiSource.search(
      { categories: ['science', 'business', 'sports'], page: 1 },
      new AbortController().signal,
    );

    expect(requestedCategories.sort()).toEqual(['business', 'science', 'sports']);
  });

  it('falls back to one unfiltered top-headlines request beyond the cap of 3 categories (AC-7, AC-8)', async () => {
    let requestCount = 0;
    server.use(
      // Neither endpoint accepts a bare request, so the no-keyword fallback goes
      // through /top-headlines with category=general, the broadest NewsAPI allows
      // (verified live against the real API).
      http.get('/api/newsapi/top-headlines', ({ request }) => {
        requestCount += 1;
        const params = new URL(request.url).searchParams;
        expect(params.get('category')).toBe('general');
        return HttpResponse.json({
          articles: [
            {
              source: { id: 'wired', name: 'Wired' },
              author: null,
              title: 'A title',
              description: null,
              url: 'https://example.com/fallback',
              urlToImage: null,
              publishedAt: '2026-11-01T00:00:00Z',
            },
          ],
        });
      }),
      http.get('/api/newsapi/everything', () => HttpResponse.json({ articles: [] })),
    );

    const categories = ['science', 'business', 'sports', 'health', 'technology'] as const;
    const articles = await newsApiSource.search(
      { categories: [...categories], page: 1 },
      new AbortController().signal,
    );

    expect(requestCount).toBe(1);
    // Tagged with the last (most recently selected) category, not dropped or split.
    expect(articles).toEqual([expect.objectContaining({ category: 'technology' })]);
  });

  it("falls back to one unfiltered top-headlines request when 'general' is among the selected categories", async () => {
    let requestCount = 0;
    server.use(
      http.get('/api/newsapi/top-headlines', () => {
        requestCount += 1;
        return HttpResponse.json({ articles: [] });
      }),
    );

    await newsApiSource.search(
      { categories: ['business', 'general'], page: 1 },
      new AbortController().signal,
    );

    expect(requestCount).toBe(1);
  });

  it('falls back to /everything with qInTitle when a keyword is given beyond the cap, satisfying its required params', async () => {
    server.use(
      http.get('/api/newsapi/everything', ({ request }) => {
        expect(new URL(request.url).searchParams.get('qInTitle')).toBe('climate');
        return HttpResponse.json({ articles: [] });
      }),
    );

    const categories = ['science', 'business', 'sports', 'health'] as const;
    await newsApiSource.search(
      { keyword: 'climate', categories: [...categories], page: 1 },
      new AbortController().signal,
    );
  });
});
