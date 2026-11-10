import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../test/server';
import { nytSource } from './nytSource';

describe('nytSource', () => {
  it('maps a search response into Articles and converts page to 0-indexed', async () => {
    server.use(
      http.get('/api/nyt/search/v2/articlesearch.json', ({ request }) => {
        expect(new URL(request.url).searchParams.get('page')).toBe('1');
        return HttpResponse.json({
          response: {
            docs: [
              {
                _id: 'nyt://article/1',
                headline: { main: 'A headline' },
                abstract: 'An abstract',
                web_url: 'https://nytimes.com/1',
                pub_date: '2026-11-01T00:00:00Z',
                byline: { original: 'By A Writer' },
                section_name: 'Technology',
                multimedia: {
                  default: { url: 'https://static01.nyt.com/images/1-articleLarge.jpg' },
                  thumbnail: { url: 'https://static01.nyt.com/images/1-thumbStandard.jpg' },
                },
              },
            ],
          },
        });
      }),
    );

    const articles = await nytSource.search({ page: 2 }, new AbortController().signal);

    expect(articles).toEqual([
      {
        id: 'nyt:nyt://article/1',
        title: 'A headline',
        summary: 'An abstract',
        url: 'https://nytimes.com/1',
        imageUrl: 'https://static01.nyt.com/images/1-articleLarge.jpg',
        author: 'By A Writer',
        publishedAt: '2026-11-01T00:00:00Z',
        source: 'nyt',
        category: 'technology',
      },
    ]);
  });
});
