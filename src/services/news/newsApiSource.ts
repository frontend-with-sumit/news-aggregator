import type { Article, ArticleQuery, Category, NewsSource } from './types';
import { PROVIDER_ROUTES } from './providerRoutes';
import { buildQueryString, fetchJson } from './shared';

/**
 * NewsAPI's `/top-headlines` category enum; 'world' and 'politics' have no match there,
 * so they fall back to 'general' rather than dropping the category filter entirely.
 */
const CATEGORY_TO_TOP_HEADLINES_CATEGORY: Record<Category, string> = {
  general: 'general',
  world: 'general',
  politics: 'general',
  business: 'business',
  technology: 'technology',
  science: 'science',
  health: 'health',
  sports: 'sports',
  entertainment: 'entertainment',
};

interface NewsApiArticle {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
}

interface NewsApiResponse {
  articles: NewsApiArticle[];
}

function toArticle(article: NewsApiArticle, category: Category): Article {
  return {
    id: `newsapi:${article.url}`,
    title: article.title,
    summary: article.description ?? '',
    url: article.url,
    imageUrl: article.urlToImage ?? undefined,
    author: article.author ?? undefined,
    publishedAt: article.publishedAt,
    source: 'newsapi',
    category,
  };
}

export const newsApiSource: NewsSource = {
  id: 'newsapi',
  label: 'NewsAPI',

  async search(query: ArticleQuery, signal: AbortSignal): Promise<Article[]> {
    const category = query.category ?? 'general';
    // /top-headlines supports a category filter but no date range and no title-only
    // matching; /everything is the reverse. Prefer top-headlines only for a pure
    // category browse (no keyword): once a keyword is given, /everything's `qInTitle`
    // is the only way to match the headline instead of the full article body.
    const useTopHeadlines = Boolean(query.category) && !query.from && !query.to && !query.keyword;

    if (useTopHeadlines) {
      const qs = buildQueryString({
        category: CATEGORY_TO_TOP_HEADLINES_CATEGORY[category],
        page: query.page,
        pageSize: 20,
      });
      const { articles } = await fetchJson<NewsApiResponse>(
        `${PROVIDER_ROUTES.newsapi.basePath}/top-headlines${qs}`,
        signal,
      );
      return (articles ?? []).map((article) => toArticle(article, category));
    }

    const qs = buildQueryString({
      qInTitle: query.keyword || category,
      from: query.from,
      to: query.to,
      page: query.page,
      pageSize: 20,
      sortBy: 'publishedAt',
    });
    const { articles } = await fetchJson<NewsApiResponse>(
      `${PROVIDER_ROUTES.newsapi.basePath}/everything${qs}`,
      signal,
    );
    return (articles ?? []).map((article) => toArticle(article, category));
  },
};
