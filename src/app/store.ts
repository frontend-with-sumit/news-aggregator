import { configureStore, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { newsApi } from '@/features/news/newsApi';
import {
  preferencesReducer,
  selectActivePreferences,
  toggleCategory,
  toggleSource,
  type PreferencesState,
} from '@/features/preferences/preferencesSlice';
import {
  searchParamsReducer,
  syncFromPreferences,
  type SearchParamsState,
} from '@/features/search/searchParamsSlice';

export function createAppStore(preloadedState?: {
  preferences: PreferencesState;
  searchParams: SearchParamsState;
}) {
  const listenerMiddleware = createListenerMiddleware();

  const appStore = configureStore({
    reducer: {
      preferences: preferencesReducer,
      searchParams: searchParamsReducer,
      [newsApi.reducerPath]: newsApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(listenerMiddleware.middleware).concat(newsApi.middleware),
    ...(preloadedState ? { preloadedState } : {}),
  });

  listenerMiddleware.startListening({
    matcher: isAnyOf(toggleSource, toggleCategory),
    effect: (_action, api) => {
      api.dispatch(
        syncFromPreferences(selectActivePreferences(api.getState() as ReturnType<typeof appStore.getState>)),
      );
    },
  });

  return appStore;
}

export const store = createAppStore();

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
