import type { Article, ArticleQuery, Category, NewsSource } from './types';
import { PROVIDER_ROUTES } from './providerRoutes';
import { buildQueryString, fetchJson, toCompactDate } from './shared';

/** Our Category to the NYT Article Search `section_name` facet; 'general' has no filter. */
const CATEGORY_TO_SECTION: Partial<Record<Category, string>> = {
  world: 'World',
  politics: 'Politics',
  business: 'Business',
  technology: 'Technology',
  science: 'Science',
  health: 'Health',
  sports: 'Sports',
  entertainment: 'Arts',
};
const SECTION_TO_CATEGORY: Record<string, Category> = Object.fromEntries(
  Object.entries(CATEGORY_TO_SECTION).map(([category, section]) => [section, category]),
) as Record<string, Category>;

interface NytDoc {
  _id: string;
  headline: { main: string };
  abstract: string;
  web_url: string;
  pub_date: string;
  byline?: { original?: string };
  section_name?: string;
  multimedia?: { url: string }[];
}

interface NytResponse {
  response: { docs: NytDoc[] };
}

function toArticle(doc: NytDoc): Article {
  const image = doc.multimedia?.[0]?.url;
  return {
    id: `nyt:${doc._id}`,
    title: doc.headline.main,
    summary: doc.abstract,
    url: doc.web_url,
    imageUrl: image ? `https://www.nytimes.com/${image}` : undefined,
    author: doc.byline?.original,
    publishedAt: doc.pub_date,
    source: 'nyt',
    category: (doc.section_name ? SECTION_TO_CATEGORY[doc.section_name] : undefined) ?? 'general',
  };
}

export const nytSource: NewsSource = {
  id: 'nyt',
  label: 'The New York Times',

  async search(query: ArticleQuery, signal: AbortSignal): Promise<Article[]> {
    const section = query.category ? CATEGORY_TO_SECTION[query.category] : undefined;
    const qs = buildQueryString({
      q: query.keyword,
      fq: section ? `section_name:("${section}")` : undefined,
      begin_date: query.from ? toCompactDate(query.from) : undefined,
      end_date: query.to ? toCompactDate(query.to) : undefined,
      // NYT paginates 0-indexed, 10 results per page, while our ArticleQuery is 1-indexed.
      page: query.page - 1,
    });
    const { response } = await fetchJson<NytResponse>(
      `${PROVIDER_ROUTES.nyt.basePath}/search/v2/articlesearch.json${qs}`,
      signal,
    );
    return response.docs.map(toArticle);
  },
};
