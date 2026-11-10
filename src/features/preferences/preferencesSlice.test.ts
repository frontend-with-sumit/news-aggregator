import { beforeEach, describe, expect, it } from 'vitest';
import {
  PREFERENCES_STORAGE_KEY,
  preferencesReducer,
  readStoredPreferences,
  setPreferredAuthor,
  toggleCategory,
  toggleSource,
  type PreferencesState,
} from './preferencesSlice';

const defaultState: PreferencesState = {
  preferredSources: ['guardian', 'nyt', 'newsapi'],
  preferredCategories: ['general'],
  preferredAuthor: '',
};

describe('preferencesSlice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('falls back to the default preferences when localStorage is empty', () => {
    expect(readStoredPreferences()).toEqual(defaultState);
  });

  it('falls back to the default preferences when the stored shape is invalid', () => {
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ preferredSources: 'not-an-array' }),
    );

    expect(readStoredPreferences()).toEqual(defaultState);
  });

  it('falls back to the default preferences when the stored value is corrupted JSON', () => {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, '{not json');

    expect(readStoredPreferences()).toEqual(defaultState);
  });

  it('toggles a source off and persists the change', () => {
    const next = preferencesReducer(defaultState, toggleSource('nyt'));

    expect(next.preferredSources).toEqual(['guardian', 'newsapi']);
    expect(JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY)!)).toEqual(next);
  });

  it('refuses to toggle off the last remaining source', () => {
    const singleSource: PreferencesState = { ...defaultState, preferredSources: ['guardian'] };

    const next = preferencesReducer(singleSource, toggleSource('guardian'));

    expect(next.preferredSources).toEqual(['guardian']);
  });

  it('toggles a category on', () => {
    const next = preferencesReducer(defaultState, toggleCategory('technology'));

    expect(next.preferredCategories).toEqual(['general', 'technology']);
  });

  it('refuses to toggle off the last remaining category', () => {
    const next = preferencesReducer(defaultState, toggleCategory('general'));

    expect(next.preferredCategories).toEqual(['general']);
  });

  it('sets the preferred author and persists the change', () => {
    const next = preferencesReducer(defaultState, setPreferredAuthor('Jane Doe'));

    expect(next.preferredAuthor).toBe('Jane Doe');
    expect(JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY)!)).toEqual(next);
  });

  it('falls back to the default preferences when the stored author is not a string', () => {
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ ...defaultState, preferredAuthor: 42 }),
    );

    expect(readStoredPreferences()).toEqual(defaultState);
  });
});
