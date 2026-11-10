import './ArticleCard.css';
import './ArticleCardSkeleton.css';

export function ArticleCardSkeleton() {
  return (
    <div className="article-card article-card-skeleton" aria-hidden="true">
      <div className="article-card__media">
        <div className="article-card__image article-card-skeleton__block" />
      </div>
      <div className="article-card__body">
        <div className="article-card-skeleton__line article-card-skeleton__line--title" />
        <div className="article-card-skeleton__line article-card-skeleton__line--short" />
      </div>
    </div>
  );
}
