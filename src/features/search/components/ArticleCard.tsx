import type { Article } from '@/services/news';
import './ArticleCard.css';

const PLACEHOLDER_IMAGE = 'https://placehold.co/600x400?text=No+Image';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="article-card">
      <a
        className="article-card__link"
        href={article.url}
        target="_blank"
        rel="noreferrer noopener"
        aria-label={`Read "${article.title}" on ${article.source} (opens in a new tab)`}
      >
        <div className="article-card__media">
          <img
            className="article-card__image"
            src={article.imageUrl ?? PLACEHOLDER_IMAGE}
            alt=""
            loading="lazy"
          />
          <span className="article-card__badge article-card__badge--source">{article.source}</span>
          <time
            className="article-card__badge article-card__badge--date"
            dateTime={article.publishedAt}
          >
            {formatDate(article.publishedAt)}
          </time>
        </div>
        <div className="article-card__body">
          <h3 className="article-card__title">{article.title}</h3>
          <p className="article-card__summary">{article.summary}</p>
        </div>
      </a>
    </article>
  );
}
