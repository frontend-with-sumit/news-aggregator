import { useState } from 'react';
import type { SourceError } from '@/features/news/newsApi';
import './StatusBanner.css';

export function StatusBanner({ sourceErrors }: { sourceErrors: SourceError[] }) {
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const errorKey = sourceErrors.map((entry) => `${entry.source}:${entry.message}`).join('|');

  if (sourceErrors.length === 0 || dismissedKey === errorKey) {
    return null;
  }

  return (
    <div className="status-banner" role="alert">
      <ul className="status-banner__list">
        {sourceErrors.map((entry) => (
          <li key={entry.source}>
            <strong className="status-banner__source">{entry.source}</strong>: {entry.message}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="status-banner__dismiss"
        onClick={() => setDismissedKey(errorKey)}
        aria-label="Dismiss error banner"
      >
        ×
      </button>
    </div>
  );
}
