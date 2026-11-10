import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import {
  NEWS_SOURCES,
  type Article,
  type ArticleQuery,
  type Category,
  type SourceId,
} from '@/services/news';

export interface SourceError {
  source: SourceId;
  message: string;
}

export interface SearchArticlesArgs {
  keyword: string;
  /**
   * Ordered oldest-selected to newest-selected (mirrors preferences.preferredCategories'
   * insertion order). Empty means no category filter at all.
   */
  categories: Category[];
  sources: SourceId[];
  /** Inclusive date range, `YYYY-MM-DD`. Either end may be omitted. */
  from?: string;
  to?: string;
  /** Matched against `Article.author`, client-side: no provider supports this natively. */
  author: string;
  page: number;
}

export interface SearchArticlesResult {
  articles: Article[];
  sourceErrors: SourceError[];
}

export interface SearchArticlesError {
  message: string;
  sourceErrors: SourceError[];
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface FetchResult {
  sourceId: SourceId;
  articles: Article[];
  errorMessage: string | null;
}

export const newsApi = createApi({
  reducerPath: 'newsApi',
  baseQuery: fakeBaseQuery<SearchArticlesError>(),
  endpoints: (builder) => ({
    searchArticles: builder.query<SearchArticlesResult, SearchArticlesArgs>({
      async queryFn(args, { signal }) {
        // Guardian and NYT each collapse every selected category into one request;
        // NewsAPI's adapter applies its own per-category cap/fallback internally (see
        // spec 0004). So every source is called exactly once per search, regardless of
        // how many categories are selected.
        const fetches: Promise<FetchResult>[] = args.sources.map(async (sourceId) => {
          const query: ArticleQuery = {
            keyword: args.keyword || undefined,
            categories: args.categories,
            from: args.from,
            to: args.to,
            page: args.page,
          };
          try {
            const articles = await NEWS_SOURCES[sourceId].search(query, signal);
            return { sourceId, articles, errorMessage: null };
          } catch (error) {
            return { sourceId, articles: [], errorMessage: toErrorMessage(error) };
          }
        });

        const results = await Promise.all(fetches);

        const sourceErrors: SourceError[] = results.flatMap((result) =>
          result.errorMessage !== null ? [{ source: result.sourceId, message: result.errorMessage }] : [],
        );

        if (args.sources.length > 0 && sourceErrors.length === args.sources.length) {
          return { error: { message: 'All selected sources failed', sourceErrors } };
        }

        // Group by each article's own category, most-recently-selected category first
        // (so toggling on a new category surfaces its articles at the top of the
        // feed); newest-first within each group. 'general' is a catch-all: it claims
        // every article not already claimed by a higher-priority (more recently
        // selected) group, regardless of that article's own category, rather than only
        // articles literally tagged 'general'.
        const groupOrder: (Category | 'general')[] =
          args.categories.length > 0 ? [...args.categories].reverse() : ['general'];
        const successfulArticles = results
          .filter((result) => result.errorMessage === null)
          .flatMap((result) => result.articles);
        const seenIds = new Set<string>();
        const articles: Article[] = [];
        for (const category of groupOrder) {
          const group = successfulArticles
            .filter(
              (article) =>
                !seenIds.has(article.id) && (category === 'general' || article.category === category),
            )
            .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
          for (const article of group) seenIds.add(article.id);
          articles.push(...group);
        }

        // Author personalization: no provider's query params reliably restrict results
        // to one author, so it's applied client-side, same as NYT's headline matching.
        const authorFilter = args.author.trim().toLowerCase();
        const personalized = authorFilter
          ? articles.filter((article) => article.author?.toLowerCase().includes(authorFilter))
          : articles;

        return { data: { articles: personalized, sourceErrors } };
      },
    }),
  }),
});

export const { useSearchArticlesQuery } = newsApi;
