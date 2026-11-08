import type { Article, ArticleQuery, Category, NewsSource } from './types';
import { PROVIDER_ROUTES } from './providerRoutes';
import { buildQueryString, fetchJson } from './shared';

/** Our Category to the Guardian's own section ids; 'general' has no section filter. */
const CATEGORY_TO_SECTION: Partial<Record<Category, string>> = {
  world: 'world',
  politics: 'politics',
  business: 'business',
  technology: 'technology',
  science: 'science',
  health: 'society',
  sports: 'sport',
  entertainment: 'culture',
};
const SECTION_TO_CATEGORY: Record<string, Category> = Object.fromEntries(
  Object.entries(CATEGORY_TO_SECTION).map(([category, section]) => [section, category]),
) as Record<string, Category>;

interface GuardianResult {
  id: string;
  webTitle: string;
  webUrl: string;
  webPublicationDate: string;
  sectionId: string;
  fields?: {
    trailText?: string;
    thumbnail?: string;
    byline?: string;
  };
}

interface GuardianResponse {
  response: {
    results: GuardianResult[];
  };
}

function toArticle(result: GuardianResult): Article {
  return {
    id: `guardian:${result.id}`,
    title: result.webTitle,
    summary: result.fields?.trailText ?? '',
    url: result.webUrl,
    imageUrl: result.fields?.thumbnail,
    author: result.fields?.byline,
    publishedAt: result.webPublicationDate,
    source: 'guardian',
    category: SECTION_TO_CATEGORY[result.sectionId] ?? 'general',
  };
}

export const guardianSource: NewsSource = {
  id: 'guardian',
  label: 'The Guardian',

  async search(query: ArticleQuery, signal: AbortSignal): Promise<Article[]> {
    const qs = buildQueryString({
      q: query.keyword,
      section: query.category ? CATEGORY_TO_SECTION[query.category] : undefined,
      'from-date': query.from,
      'to-date': query.to,
      page: query.page,
      'show-fields': 'trailText,thumbnail,byline',
      'order-by': 'newest',
    });
    const { response } = await fetchJson<GuardianResponse>(
      `${PROVIDER_ROUTES.guardian.basePath}/search${qs}`,
      signal,
    );
    return response.results.map(toArticle);
  },
};
