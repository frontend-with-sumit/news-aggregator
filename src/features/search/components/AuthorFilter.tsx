import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectActiveSearchParams, setAuthor } from '@/features/search/searchParamsSlice';
import './AuthorFilter.css';

const DEBOUNCE_MS = 400;

export function AuthorFilter() {
  const dispatch = useAppDispatch();
  const activeAuthor = useAppSelector((state) => selectActiveSearchParams(state).author);
  const [text, setText] = useState(activeAuthor);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (text !== activeAuthor) {
        dispatch(setAuthor(text));
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
