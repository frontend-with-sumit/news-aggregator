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
  // The NYT API serves this as a `{ default, thumbnail }` object with already-absolute
  // static01.nyt.com URLs, not the older flat array of relative paths.
  multimedia?: { default?: { url: string }; thumbnail?: { url: string } };
}

interface NytResponse {
  // NYT serves `docs: null` (not `[]`) whenever a query matches zero results.
  response: { docs: NytDoc[] | null };
}

function toArticle(doc: NytDoc): Article {
  const image = doc.multimedia?.default?.url ?? doc.multimedia?.thumbnail?.url;
  return {
    id: `nyt:${doc._id}`,
    title: doc.headline.main,
    summary: doc.abstract,
    url: doc.web_url,
    imageUrl: image,
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
    // NYT's `fq` filter parameter does not reliably return results against the live
    // API (verified directly: even NYT's own documented fq examples return zero hits),
    // and a zero-hit response serves `response.docs: null` rather than `[]`. So neither
    // the category nor the headline-only keyword match can be done via `fq`; both are
    // applied client-side against a plain `q` (or `sort=newest` when there's no
    // keyword) search instead.
    const qs = buildQueryString({
      q: query.keyword || undefined,
      sort: query.keyword ? undefined : 'newest',
      begin_date: query.from ? toCompactDate(query.from) : undefined,
      end_date: query.to ? toCompactDate(query.to) : undefined,
      // NYT paginates 0-indexed, 10 results per page, while our ArticleQuery is 1-indexed.
      page: query.page - 1,
    });
    const { response } = await fetchJson<NytResponse>(
      `${PROVIDER_ROUTES.nyt.basePath}/search/v2/articlesearch.json${qs}`,
      signal,
    );
    const keyword = query.keyword?.toLowerCase();
    const docs = (response.docs ?? []).filter((doc) => {
      const matchesKeyword = !keyword || doc.headline.main.toLowerCase().includes(keyword);
      const matchesSection = !section || doc.section_name === section;
      return matchesKeyword && matchesSection;
    });
    return docs.map(toArticle);
  },
};
