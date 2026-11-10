import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Category, SourceId } from '@/services/news';
import type { RootState } from '@/app/store';
import {
  readStoredPreferences,
  type PreferencesState,
} from '@/features/preferences/preferencesSlice';

export interface SearchParamsState {
  keyword: string;
  /** Ordered oldest-selected to newest-selected, mirrored from preferences. */
  categories: Category[];
  sources: SourceId[];
  /** Inclusive date range, `YYYY-MM-DD`. Either end may be omitted. */
  from?: string;
  to?: string;
  /** Matched against `Article.author`, client-side (no provider supports this natively). */
  author: string;
  page: number;
}

function seedFromPreferences(preferences: PreferencesState): SearchParamsState {
  return {
    keyword: '',
    categories: preferences.preferredCategories,
    sources: preferences.preferredSources,
    author: preferences.preferredAuthor,
    page: 1,
  };
}

const searchParamsSlice = createSlice({
  name: 'searchParams',
  initialState: seedFromPreferences(readStoredPreferences()),
  reducers: {
    setKeyword(state, action: PayloadAction<string>) {
      state.keyword = action.payload;
      state.page = 1;
    },
    setDateRange(state, action: PayloadAction<{ from?: string; to?: string }>) {
      state.from = action.payload.from || undefined;
      state.to = action.payload.to || undefined;
      state.page = 1;
    },
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    syncFromPreferences(state, action: PayloadAction<PreferencesState>) {
      state.sources = action.payload.preferredSources;
      state.categories = action.payload.preferredCategories;
      state.author = action.payload.preferredAuthor;
      state.page = 1;
    },
  },
});

export const { setKeyword, setDateRange, setPage, syncFromPreferences } = searchParamsSlice.actions;
export const searchParamsReducer = searchParamsSlice.reducer;

export const selectActiveSearchParams = (state: RootState): SearchParamsState => state.searchParams;
