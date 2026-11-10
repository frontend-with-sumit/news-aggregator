import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../test/server';
import { newsApiSource } from './newsApiSource';

describe('newsApiSource', () => {
  it('uses top-headlines when a category is given with no date range', async () => {
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
      { category: 'science', page: 1 },
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
      { category: 'science', from: '2026-01-01', page: 1 },
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
      { keyword: 'climate', category: 'science', page: 1 },
      new AbortController().signal,
    );
  });
});
