import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createAppStore, type RootState } from '@/app/store';
import type { PreferencesState } from '@/features/preferences/preferencesSlice';
import type { SearchParamsState } from '@/features/search/searchParamsSlice';

export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState,
  }: {
    preloadedState?: { preferences: PreferencesState; searchParams: SearchParamsState };
  } = {},
) {
  const store = createAppStore(preloadedState);
  return {
    store,
    ...render(<Provider store={store}>{ui}</Provider>),
  };
}

export type { RootState };
