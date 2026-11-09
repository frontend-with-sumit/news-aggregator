import { Link, useLocation } from 'react-router-dom';
import type { Article } from '@/services/news';
import './ArticleDetailPage.css';

const PLACEHOLDER_IMAGE = 'https://placehold.co/800x450?text=No+Image';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function ArticleDetailPage() {
  const location = useLocation();
  const article = (location.state as { article?: Article } | null)?.article;

  if (!article) {
    return (
      <main className="article-detail-page article-detail-page--fallback">
        <p>This article's data isn't available directly from this link.</p>
        <Link to="/">Go back to the feed</Link>
      </main>
    );
  }

  return (
    <main className="article-detail-page">
      <Link to="/" className="article-detail-page__back">
        ← Back to feed
      </Link>
      <img
        className="article-detail-page__image"
        src={article.imageUrl ?? PLACEHOLDER_IMAGE}
        alt=""
      />
      <h1 className="article-detail-page__title">{article.title}</h1>
      <p className="article-detail-page__meta">
        <span className="article-detail-page__source">{article.source}</span>
        {article.author ? <span> · {article.author}</span> : null}
        <span> · </span>
        <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
      </p>
      <p className="article-detail-page__summary">{article.summary}</p>
      <a
        className="article-detail-page__link"
        href={article.url}
        target="_blank"
        rel="noreferrer noopener"
      >
        Read full article
      </a>
    </main>
  );
}
