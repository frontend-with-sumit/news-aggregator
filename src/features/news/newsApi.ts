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
  category: Category | undefined;
  articles: Article[];
  errorMessage: string | null;
}

export const newsApi = createApi({
  reducerPath: 'newsApi',
  baseQuery: fakeBaseQuery<SearchArticlesError>(),
  endpoints: (builder) => ({
    searchArticles: builder.query<SearchArticlesResult, SearchArticlesArgs>({
      async queryFn(args, { signal }) {
        // undefined stands for "no category filter"; each adapter already treats a
        // missing category the same as 'general' (no section/facet restriction).
        const categoryGroups: (Category | undefined)[] =
          args.categories.length > 0 ? args.categories : [undefined];

        const fetches: Promise<FetchResult>[] = args.sources.flatMap((sourceId) =>
          categoryGroups.map(async (category) => {
            const query: ArticleQuery = {
              keyword: args.keyword || undefined,
              category,
              page: args.page,
            };
            try {
              const articles = await NEWS_SOURCES[sourceId].search(query, signal);
              return { sourceId, category, articles, errorMessage: null };
            } catch (error) {
              return { sourceId, category, articles: [], errorMessage: toErrorMessage(error) };
            }
          }),
        );

        const results = await Promise.all(fetches);

        // A source counts as failed only if every one of its category fetches failed;
        // a failure for one selected category while another succeeds is tolerated.
        const sourceErrors: SourceError[] = args.sources.flatMap((sourceId) => {
          const forSource = results.filter((result) => result.sourceId === sourceId);
          const firstError = forSource.find((result) => result.errorMessage !== null)?.errorMessage;
          const allFailed =
            forSource.length > 0 && forSource.every((result) => result.errorMessage !== null);
          return allFailed && firstError ? [{ source: sourceId, message: firstError }] : [];
        });

        if (args.sources.length > 0 && sourceErrors.length === args.sources.length) {
          return { error: { message: 'All selected sources failed', sourceErrors } };
        }

        // Group by category, most-recently-selected category first (so toggling on a
        // new category surfaces its articles at the top of the feed); newest-first
        // within each group. Dedupe articles that surface under more than one
        // category/source (e.g. the unfiltered 'general' fetch overlapping a specific
        // category), keeping each one only in its highest-priority group.
        const seenIds = new Set<string>();
        const articles: Article[] = [];
        for (const category of [...categoryGroups].reverse()) {
          const group = results
            .filter((result) => result.category === category && result.errorMessage === null)
            .flatMap((result) => result.articles)
            .filter((article) => {
              if (seenIds.has(article.id)) return false;
              seenIds.add(article.id);
              return true;
            })
            .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
          articles.push(...group);
        }

        return { data: { articles, sourceErrors } };
      },
    }),
  }),
});

export const { useSearchArticlesQuery } = newsApi;
