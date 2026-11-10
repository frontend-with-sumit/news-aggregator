import { describe, expect, it } from 'vitest';
import type { PreferencesState } from '@/features/preferences/preferencesSlice';
import {
  searchParamsReducer,
  setKeyword,
  setPage,
  syncFromPreferences,
  type SearchParamsState,
} from './searchParamsSlice';

const baseState: SearchParamsState = {
  keyword: 'climate',
  categories: ['technology'],
  sources: ['guardian'],
  page: 3,
};

describe('searchParamsSlice', () => {
  it('resets the page when the keyword changes', () => {
    const next = searchParamsReducer(baseState, setKeyword('ai'));

    expect(next.keyword).toBe('ai');
    expect(next.page).toBe(1);
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
