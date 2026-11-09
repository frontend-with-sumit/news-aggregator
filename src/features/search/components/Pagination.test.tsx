import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('disables Previous on page 1', () => {
    render(
      <Pagination page={1} canGoNext={true} disabled={false} onPrevious={vi.fn()} onNext={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('disables Next once the current page has no results', () => {
    render(
      <Pagination page={2} canGoNext={false} disabled={false} onPrevious={vi.fn()} onNext={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});
