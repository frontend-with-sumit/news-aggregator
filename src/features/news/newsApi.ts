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
  category: Category | null;
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

export const newsApi = createApi({
  reducerPath: 'newsApi',
  baseQuery: fakeBaseQuery<SearchArticlesError>(),
  endpoints: (builder) => ({
    searchArticles: builder.query<SearchArticlesResult, SearchArticlesArgs>({
      async queryFn(args, { signal }) {
        const query: ArticleQuery = {
          keyword: args.keyword || undefined,
          category: args.category ?? undefined,
          page: args.page,
        };

        const perSource = await Promise.all(
          args.sources.map(async (sourceId) => {
            try {
              const articles = await NEWS_SOURCES[sourceId].search(query, signal);
              return { sourceId, articles, errorMessage: null as string | null };
            } catch (error) {
              return { sourceId, articles: [] as Article[], errorMessage: toErrorMessage(error) };
            }
          }),
        );

        const sourceErrors: SourceError[] = perSource
          .filter((result) => result.errorMessage !== null)
          .map((result) => ({ source: result.sourceId, message: result.errorMessage! }));

        if (args.sources.length > 0 && sourceErrors.length === args.sources.length) {
          return { error: { message: 'All selected sources failed', sourceErrors } };
        }

        const articles = perSource
          .flatMap((result) => result.articles)
          .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

        return { data: { articles, sourceErrors } };
      },
    }),
  }),
});

export const { useSearchArticlesQuery } = newsApi;
