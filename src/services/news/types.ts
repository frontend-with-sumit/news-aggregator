/**
 * Domain contract for the news layer.
 *
 * The UI depends only on these types (Dependency Inversion). Each news provider
 * is wrapped by an adapter that implements `NewsSource` and returns `Article`s,
 * so adding a provider never requires touching UI code (Open/Closed).
 */

export const SOURCE_IDS = ['guardian', 'nyt', 'newsapi'] as const;
export type SourceId = (typeof SOURCE_IDS)[number];

export const CATEGORIES = [
  'general',
  'world',
  'politics',
  'business',
  'technology',
  'science',
  'health',
  'sports',
  'entertainment',
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Article {
  /** Unique across providers, e.g. `guardian:world/2026/nov/01/slug`. */
  id: string;
  title: string;
  summary: string;
  url: string;
  imageUrl?: string;
  author?: string;
  /** ISO 8601 date-time. */
  publishedAt: string;
  source: SourceId;
  category: Category;
}

export interface ArticleQuery {
  keyword?: string;
  category?: Category;
  /** Restrict to these providers; empty or undefined means all. */
  sources?: readonly SourceId[];
  /** Inclusive date range, `YYYY-MM-DD`. */
  from?: string;
  to?: string;
  /** 1-based page number. */
  page: number;
}

/** One news provider. Every adapter implements this same small interface. */
export interface NewsSource {
  readonly id: SourceId;
  readonly label: string;
  search(query: ArticleQuery, signal: AbortSignal): Promise<Article[]>;
}
