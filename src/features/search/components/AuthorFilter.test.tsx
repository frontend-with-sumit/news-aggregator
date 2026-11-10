import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/renderWithProviders';
import { selectActivePreferences } from '@/features/preferences/preferencesSlice';
import { AuthorFilter } from './AuthorFilter';

describe('AuthorFilter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces typing before persisting it as the preferred author', () => {
    const { store } = renderWithProviders(<AuthorFilter />);

    fireEvent.change(screen.getByLabelText(/author/i), { target: { value: 'Jane Doe' } });

    expect(selectActivePreferences(store.getState()).preferredAuthor).toBe('');

    vi.advanceTimersByTime(399);
    expect(selectActivePreferences(store.getState()).preferredAuthor).toBe('');

    vi.advanceTimersByTime(1);
    expect(selectActivePreferences(store.getState()).preferredAuthor).toBe('Jane Doe');
  });

  it('seeds the input from an already-preferred author', () => {
    renderWithProviders(<AuthorFilter />, {
      preloadedState: {
        preferences: {
          preferredSources: ['guardian'],
          preferredCategories: ['general'],
          preferredAuthor: 'Jane Doe',
        },
        searchParams: {
          keyword: '',
          categories: ['general'],
          sources: ['guardian'],
          author: 'Jane Doe',
          page: 1,
        },
      },
    });

    expect(screen.getByLabelText(/author/i)).toHaveValue('Jane Doe');
  });
});
