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
    // /top-headlines supports a category filter but no date range; /everything is the
    // reverse. Prefer top-headlines when a category was asked for and no range was given,
    // since matching the category exactly matters more than keyword-only search quality.
    const useTopHeadlines = Boolean(query.category) && !query.from && !query.to;

    if (useTopHeadlines) {
      const qs = buildQueryString({
        q: query.keyword,
        category: CATEGORY_TO_TOP_HEADLINES_CATEGORY[category],
        page: query.page,
        pageSize: 20,
      });
      const { articles } = await fetchJson<NewsApiResponse>(
        `${PROVIDER_ROUTES.newsapi.basePath}/top-headlines${qs}`,
        signal,
      );
      return articles.map((article) => toArticle(article, category));
    }

    const qs = buildQueryString({
      q: query.keyword || category,
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
    return articles.map((article) => toArticle(article, category));
  },
};
