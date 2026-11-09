import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { StatusBanner } from './StatusBanner';

describe('StatusBanner', () => {
  it('renders nothing when there are no source errors', () => {
    render(<StatusBanner sourceErrors={[]} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('lists one line per failed source and can be dismissed', async () => {
    const user = userEvent.setup();

    render(
      <StatusBanner
        sourceErrors={[
          { source: 'nyt', message: 'Rate limited' },
          { source: 'newsapi', message: 'Invalid key' },
        ]}
      />,
    );

    expect(screen.getByText(/Rate limited/)).toBeInTheDocument();
    expect(screen.getByText(/Invalid key/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
