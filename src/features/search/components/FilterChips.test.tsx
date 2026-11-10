import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/renderWithProviders';
import { FilterChips } from './FilterChips';

describe('FilterChips', () => {
  it('disables the last remaining selected source chip', () => {
    renderWithProviders(<FilterChips />, {
      preloadedState: {
        preferences: {
          preferredSources: ['guardian'],
          preferredCategories: ['general'],
          preferredAuthor: '',
        },
        searchParams: {
          keyword: '',
          categories: ['general'],
          sources: ['guardian'],
          author: '',
          page: 1,
        },
      },
    });

    expect(screen.getByRole('button', { name: 'The Guardian' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'general' })).toBeDisabled();
  });

  it('leaves non-last chips enabled', () => {
    renderWithProviders(<FilterChips />);

    expect(screen.getByRole('button', { name: 'The Guardian' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'The New York Times' })).toBeEnabled();
  });
});
