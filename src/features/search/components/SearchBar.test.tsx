import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/renderWithProviders';
import { selectActiveSearchParams } from '@/features/search/searchParamsSlice';
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces typing before dispatching the keyword', () => {
    const { store } = renderWithProviders(<SearchBar />);

    fireEvent.change(screen.getByLabelText(/search articles/i), {
      target: { value: 'elections' },
    });

    expect(selectActiveSearchParams(store.getState()).keyword).toBe('');

    vi.advanceTimersByTime(399);
    expect(selectActiveSearchParams(store.getState()).keyword).toBe('');

    vi.advanceTimersByTime(1);
    expect(selectActiveSearchParams(store.getState()).keyword).toBe('elections');
  });
});
