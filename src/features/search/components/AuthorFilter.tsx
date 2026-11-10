import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  selectActivePreferences,
  setPreferredAuthor,
} from '@/features/preferences/preferencesSlice';
import './AuthorFilter.css';

const DEBOUNCE_MS = 400;

export function AuthorFilter() {
  const dispatch = useAppDispatch();
  const preferredAuthor = useAppSelector((state) => selectActivePreferences(state).preferredAuthor);
  const [text, setText] = useState(preferredAuthor);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (text !== preferredAuthor) {
        dispatch(setPreferredAuthor(text));
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className="author-filter">
      <label className="author-filter__label" htmlFor="author-filter-input">
        Author
      </label>
      <input
        id="author-filter-input"
        type="text"
        className="author-filter__input"
        placeholder="Filter by author…"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
    </div>
  );
}
