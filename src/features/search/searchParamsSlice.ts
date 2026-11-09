import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Category, SourceId } from '@/services/news';
import type { RootState } from '@/app/store';
import {
  readStoredPreferences,
  type PreferencesState,
} from '@/features/preferences/preferencesSlice';

export interface SearchParamsState {
  keyword: string;
  category: Category | null;
  sources: SourceId[];
  page: number;
}

function seedFromPreferences(preferences: PreferencesState): SearchParamsState {
  return {
    keyword: '',
    category: preferences.preferredCategories[0] ?? 'general',
    sources: preferences.preferredSources,
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
    setCategory(state, action: PayloadAction<Category | null>) {
      state.category = action.payload;
      state.page = 1;
    },
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    syncFromPreferences(state, action: PayloadAction<PreferencesState>) {
      state.sources = action.payload.preferredSources;
      state.category = action.payload.preferredCategories[0] ?? 'general';
      state.page = 1;
    },
  },
});

export const { setKeyword, setCategory, setPage, syncFromPreferences } = searchParamsSlice.actions;
export const searchParamsReducer = searchParamsSlice.reducer;

export const selectActiveSearchParams = (state: RootState): SearchParamsState => state.searchParams;
