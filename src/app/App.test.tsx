import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppProviders } from './providers';
import { App } from './App';

describe('App', () => {
  it('renders the application heading', async () => {
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );

    expect(await screen.findByRole('heading', { name: /news aggregator/i })).toBeInTheDocument();
  });
});
