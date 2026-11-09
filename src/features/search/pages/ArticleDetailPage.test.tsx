import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { Article } from '@/services/news';
import { ArticleDetailPage } from './ArticleDetailPage';

const article: Article = {
  id: 'guardian:world/2026/nov/01/slug',
  title: 'A headline',
  summary: 'A summary',
  url: 'https://example.com/article',
  publishedAt: '2026-11-01T00:00:00.000Z',
  source: 'guardian',
  category: 'world',
};

describe('ArticleDetailPage', () => {
  it('shows the article when it arrives via navigation state', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/article/x', state: { article } }]}>
        <ArticleDetailPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'A headline' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /read full article/i })).toHaveAttribute(
      'href',
      article.url,
    );
  });

  it('shows a go-back fallback when no article state is present', () => {
    render(
      <MemoryRouter initialEntries={['/article/x']}>
        <ArticleDetailPage />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go back to the feed/i })).toHaveAttribute(
      'href',
      '/',
    );
  });
});
