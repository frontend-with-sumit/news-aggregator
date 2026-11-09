import type { NewsSource, SourceId } from './types';
import { guardianSource } from './guardianSource';
import { nytSource } from './nytSource';
import { newsApiSource } from './newsApiSource';

export const NEWS_SOURCES: Record<SourceId, NewsSource> = {
  guardian: guardianSource,
  nyt: nytSource,
  newsapi: newsApiSource,
};

export * from './types';
export { PROVIDER_ROUTES } from './providerRoutes';
