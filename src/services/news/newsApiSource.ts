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

/** NewsAPI's `category` param only accepts one value; above this many selected
 *  categories it isn't worth one request each, so we fall back to a single
 *  unfiltered request instead (see spec 0004). */
const CATEGORY_CAP = 3;

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

async function searchOneCategory(
  query: ArticleQuery,
  category: Category,
  signal: AbortSignal,
): Promise<Article[]> {
  // /top-headlines supports a category filter but no date range and no title-only
  // matching; /everything is the reverse. Prefer top-headlines only for a pure
  // category browse (no keyword): once a keyword is given, /everything's `qInTitle`
  // is the only way to match the headline instead of the full article body.
  const useTopHeadlines = !query.from && !query.to && !query.keyword;

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
}

export const newsApiSource: NewsSource = {
  id: 'newsapi',
  label: 'NewsAPI',

  async search(query: ArticleQuery, signal: AbortSignal): Promise<Article[]> {
    const categories = query.categories ?? [];
    // 'general' always means no filter, and NewsAPI has no multi-category request
    // shape, so both "general selected" and "more than the cap selected" fall back
    // to one broad, unfiltered request instead of one per category.
    const useFallback =
      categories.length === 0 || categories.includes('general') || categories.length > CATEGORY_CAP;

    if (useFallback) {
      const fallbackCategory: Category = categories.length > 0 ? categories[categories.length - 1]! : 'general';

      // Neither endpoint accepts a truly bare request: /everything requires one of
      // q/qInTitle/sources/domains, and /top-headlines requires one of
      // sources/q/language/country/category (both verified live against the real
      // API). With no keyword to put in qInTitle, /top-headlines with
      // category=general is the broadest request NewsAPI actually allows, so that's
      // the fallback; the tradeoff is /top-headlines has no date-range param, so
      // from/to are not honored in the no-keyword fallback case.
      if (!query.keyword) {
        const qs = buildQueryString({ category: 'general', page: query.page, pageSize: 20 });
        const { articles } = await fetchJson<NewsApiResponse>(
          `${PROVIDER_ROUTES.newsapi.basePath}/top-headlines${qs}`,
          signal,
        );
        return (articles ?? []).map((article) => toArticle(article, fallbackCategory));
      }

      const qs = buildQueryString({
        qInTitle: query.keyword,
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
      return (articles ?? []).map((article) => toArticle(article, fallbackCategory));
    }

    const batches = await Promise.all(
      categories.map((category) => searchOneCategory(query, category, signal)),
    );
    return batches.flat();
  },
};
