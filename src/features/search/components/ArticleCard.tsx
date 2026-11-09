import { useNavigate } from 'react-router-dom';
import type { Article } from '@/services/news';
import './ArticleCard.css';

const PLACEHOLDER_IMAGE = 'https://placehold.co/400x240?text=No+Image';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function ArticleCard({ article }: { article: Article }) {
  const navigate = useNavigate();

  function handleClick() {
    void navigate(`/article/${encodeURIComponent(article.id)}`, { state: { article } });
  }

  return (
    <article className="article-card">
      <button
        type="button"
        className="article-card__link"
        aria-label={`Open article: ${article.title}`}
        onClick={handleClick}
      >
        <img
          className="article-card__image"
          src={article.imageUrl ?? PLACEHOLDER_IMAGE}
          alt=""
          loading="lazy"
        />
        <div className="article-card__body">
          <h3 className="article-card__title">{article.title}</h3>
          <p className="article-card__summary">{article.summary}</p>
          <p className="article-card__meta">
            <span className="article-card__source">{article.source}</span>
            <span aria-hidden="true"> · </span>
            <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
          </p>
        </div>
      </button>
    </article>
  );
}
