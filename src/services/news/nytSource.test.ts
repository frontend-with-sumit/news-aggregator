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

  it('matches the keyword against the headline and the category client-side (NYT fq does not work)', async () => {
    server.use(
      http.get('/api/nyt/search/v2/articlesearch.json', ({ request }) => {
        const params = new URL(request.url).searchParams;
        expect(params.get('q')).toBe('climate');
        expect(params.get('fq')).toBeNull();
        return HttpResponse.json({
          response: {
            docs: [
              {
                _id: 'matches',
                headline: { main: 'Climate talks begin' },
                abstract: '',
                web_url: 'https://nytimes.com/matches',
                pub_date: '2026-11-01T00:00:00Z',
                section_name: 'World',
              },
              {
                _id: 'wrong-section',
                headline: { main: 'Climate talks begin' },
                abstract: '',
                web_url: 'https://nytimes.com/wrong-section',
                pub_date: '2026-11-01T00:00:00Z',
                section_name: 'Business',
              },
              {
                _id: 'wrong-headline',
                headline: { main: 'Unrelated story' },
                abstract: 'mentions climate deep in the body only',
                web_url: 'https://nytimes.com/wrong-headline',
                pub_date: '2026-11-01T00:00:00Z',
                section_name: 'World',
              },
            ],
          },
        });
      }),
    );

    const articles = await nytSource.search(
      { keyword: 'climate', categories: ['world'], page: 1 },
      new AbortController().signal,
    );

    expect(articles.map((article) => article.id)).toEqual(['nyt:matches']);
  });

  it('fetches once and matches any of several selected categories client-side (AC-6)', async () => {
    let requestCount = 0;
    server.use(
      http.get('/api/nyt/search/v2/articlesearch.json', () => {
        requestCount += 1;
        return HttpResponse.json({
          response: {
            docs: [
              {
                _id: 'world-doc',
                headline: { main: 'World story' },
                abstract: '',
                web_url: 'https://nytimes.com/world',
                pub_date: '2026-11-01T00:00:00Z',
                section_name: 'World',
              },
              {
                _id: 'tech-doc',
                headline: { main: 'Tech story' },
                abstract: '',
                web_url: 'https://nytimes.com/tech',
                pub_date: '2026-11-01T00:00:00Z',
                section_name: 'Technology',
              },
              {
                _id: 'business-doc',
                headline: { main: 'Business story' },
                abstract: '',
                web_url: 'https://nytimes.com/business',
                pub_date: '2026-11-01T00:00:00Z',
                section_name: 'Business',
              },
            ],
          },
        });
      }),
    );

    const articles = await nytSource.search(
      { categories: ['world', 'technology'], page: 1 },
      new AbortController().signal,
    );

    expect(requestCount).toBe(1);
    expect(articles.map((article) => article.id).sort()).toEqual(['nyt:tech-doc', 'nyt:world-doc']);
  });

  it("does not filter by category at all when 'general' is among the selected categories", async () => {
    server.use(
      http.get('/api/nyt/search/v2/articlesearch.json', () =>
        HttpResponse.json({
          response: {
            docs: [
              {
                _id: 'business-doc',
                headline: { main: 'Business story' },
                abstract: '',
                web_url: 'https://nytimes.com/business',
                pub_date: '2026-11-01T00:00:00Z',
                section_name: 'Business',
              },
            ],
          },
        }),
      ),
    );

    const articles = await nytSource.search(
      { categories: ['general', 'world'], page: 1 },
      new AbortController().signal,
    );

    expect(articles.map((article) => article.id)).toEqual(['nyt:business-doc']);
  });

  it('treats a null docs response (NYT returns this on zero hits) as an empty result', async () => {
    server.use(
      http.get('/api/nyt/search/v2/articlesearch.json', () =>
        HttpResponse.json({ response: { docs: null } }),
      ),
    );

    const articles = await nytSource.search(
      { keyword: 'climate', page: 1 },
      new AbortController().signal,
    );

    expect(articles).toEqual([]);
  });
});
