import type { Article } from '@/services/news';
import { ArticleCard } from './ArticleCard';
import { ArticleCardSkeleton } from './ArticleCardSkeleton';
import './ArticleList.css';

const SKELETON_COUNT = 6;

export function ArticleList({ articles, isFetching }: { articles: Article[]; isFetching: boolean }) {
  if (isFetching) {
    return (
      <div className="article-list" aria-busy="true" aria-live="polite">
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <ArticleCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <p className="article-list__empty">
        No articles found. Try widening your search or enabling more sources.
      </p>
    );
  }

  return (
    <div className="article-list">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}
