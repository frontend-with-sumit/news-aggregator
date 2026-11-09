import { configureStore, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { newsApi } from '@/features/news/newsApi';
import {
  preferencesReducer,
  selectActivePreferences,
  toggleCategory,
  toggleSource,
} from '@/features/preferences/preferencesSlice';
import { searchParamsReducer, syncFromPreferences } from '@/features/search/searchParamsSlice';

const listenerMiddleware = createListenerMiddleware();

export const store = configureStore({
  reducer: {
    preferences: preferencesReducer,
    searchParams: searchParamsReducer,
    [newsApi.reducerPath]: newsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(listenerMiddleware.middleware).concat(newsApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

listenerMiddleware.startListening({
  matcher: isAnyOf(toggleSource, toggleCategory),
  effect: (_action, api) => {
    api.dispatch(syncFromPreferences(selectActivePreferences(api.getState() as RootState)));
  },
});
