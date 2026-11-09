import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { CATEGORIES, SOURCE_IDS, type Category, type SourceId } from '@/services/news';
import type { RootState } from '@/app/store';

export const PREFERENCES_STORAGE_KEY = 'news-aggregator:preferences';

export interface PreferencesState {
  preferredSources: SourceId[];
  preferredCategories: Category[];
}

const defaultPreferences: PreferencesState = {
  preferredSources: [...SOURCE_IDS],
  preferredCategories: ['general'],
};

function isSourceIdArray(value: unknown): value is SourceId[] {
  return Array.isArray(value) && value.every((entry) => SOURCE_IDS.includes(entry as SourceId));
}

function isCategoryArray(value: unknown): value is Category[] {
  return Array.isArray(value) && value.every((entry) => CATEGORIES.includes(entry as Category));
}

export function readStoredPreferences(): PreferencesState {
  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) return defaultPreferences;

    const parsed = JSON.parse(raw) as Partial<Record<keyof PreferencesState, unknown>>;
    const { preferredSources, preferredCategories } = parsed;
    if (
      !isSourceIdArray(preferredSources) ||
      preferredSources.length === 0 ||
      !isCategoryArray(preferredCategories) ||
      preferredCategories.length === 0
    ) {
      return defaultPreferences;
    }
    return { preferredSources, preferredCategories };
  } catch {
    return defaultPreferences;
  }
}

function persistPreferences(state: PreferencesState): void {
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable (private mode, quota); preferences just won't persist.
  }
}

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState: readStoredPreferences(),
  reducers: {
    toggleSource(state, action: PayloadAction<SourceId>) {
      const next = state.preferredSources.includes(action.payload)
        ? state.preferredSources.filter((id) => id !== action.payload)
        : [...state.preferredSources, action.payload];
      if (next.length === 0) return;
      state.preferredSources = next;
      persistPreferences(state);
    },
    toggleCategory(state, action: PayloadAction<Category>) {
      const next = state.preferredCategories.includes(action.payload)
        ? state.preferredCategories.filter((category) => category !== action.payload)
        : [...state.preferredCategories, action.payload];
      if (next.length === 0) return;
      state.preferredCategories = next;
      persistPreferences(state);
    },
  },
});

export const { toggleSource, toggleCategory } = preferencesSlice.actions;
export const preferencesReducer = preferencesSlice.reducer;

export const selectActivePreferences = (state: RootState): PreferencesState => state.preferences;
