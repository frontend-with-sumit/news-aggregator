import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../test/server';
import { guardianSource } from './guardianSource';

describe('guardianSource', () => {
  it('maps a search response into Articles', async () => {
    server.use(
      http.get('/api/guardian/search', ({ request }) => {
        const params = new URL(request.url).searchParams;
        expect(params.get('q')).toBe('climate');
        expect(params.get('query-fields')).toBe('headline');
        return HttpResponse.json({
          response: {
            results: [
              {
                id: 'world/2026/nov/01/slug',
                webTitle: 'Climate story',
                webUrl: 'https://theguardian.com/world/2026/nov/01/slug',
                webPublicationDate: '2026-11-01T00:00:00Z',
                sectionId: 'world',
                fields: { trailText: 'Summary', thumbnail: 'https://img', byline: 'A Writer' },
              },
            ],
          },
        });
      }),
    );

    const articles = await guardianSource.search(
      { keyword: 'climate', page: 1 },
      new AbortController().signal,
    );

    expect(articles).toEqual([
      {
        id: 'guardian:world/2026/nov/01/slug',
        title: 'Climate story',
        summary: 'Summary',
        url: 'https://theguardian.com/world/2026/nov/01/slug',
        imageUrl: 'https://img',
        author: 'A Writer',
        publishedAt: '2026-11-01T00:00:00Z',
        source: 'guardian',
        category: 'world',
      },
    ]);
  });

  it('throws on a non-OK response', async () => {
    server.use(http.get('/api/guardian/search', () => new HttpResponse(null, { status: 500 })));

    await expect(guardianSource.search({ page: 1 }, new AbortController().signal)).rejects.toThrow(
      '500',
    );
  });
});
