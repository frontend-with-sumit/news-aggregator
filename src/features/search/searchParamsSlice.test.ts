import { describe, expect, it } from 'vitest';
import type { PreferencesState } from '@/features/preferences/preferencesSlice';
import {
  searchParamsReducer,
  setAuthor,
  setDateRange,
  setKeyword,
  setPage,
  syncFromPreferences,
  type SearchParamsState,
} from './searchParamsSlice';

const baseState: SearchParamsState = {
  keyword: 'climate',
  categories: ['technology'],
  sources: ['guardian'],
  author: '',
  page: 3,
};

describe('searchParamsSlice', () => {
  it('resets the page when the keyword changes', () => {
    const next = searchParamsReducer(baseState, setKeyword('ai'));

    expect(next.keyword).toBe('ai');
    expect(next.page).toBe(1);
  });

  it('resets the page when the author filter changes', () => {
    const next = searchParamsReducer(baseState, setAuthor('Jane Doe'));

    expect(next.author).toBe('Jane Doe');
    expect(next.page).toBe(1);
  });

  it('sets the date range and resets the page', () => {
    const next = searchParamsReducer(
      baseState,
      setDateRange({ from: '2026-01-01', to: '2026-02-01' }),
    );

    expect(next.from).toBe('2026-01-01');
    expect(next.to).toBe('2026-02-01');
    expect(next.page).toBe(1);
  });

  it('clears a date range end left blank', () => {
    const withRange: SearchParamsState = { ...baseState, from: '2026-01-01', to: '2026-02-01' };

    const next = searchParamsReducer(withRange, setDateRange({ from: '2026-01-01', to: '' }));

    expect(next.from).toBe('2026-01-01');
    expect(next.to).toBeUndefined();
  });

  it('sets the page without touching other params', () => {
    const next = searchParamsReducer(baseState, setPage(5));

    expect(next.page).toBe(5);
    expect(next.keyword).toBe('climate');
  });

  it('re-seeds sources and categories (in selection order) from an updated preferences state', () => {
    const updatedPreferences: PreferencesState = {
      preferredSources: ['nyt', 'newsapi'],
      preferredCategories: ['sports', 'business'],
    };

    const next = searchParamsReducer(baseState, syncFromPreferences(updatedPreferences));

    expect(next.sources).toEqual(['nyt', 'newsapi']);
    expect(next.categories).toEqual(['sports', 'business']);
    expect(next.page).toBe(1);
  });
});
