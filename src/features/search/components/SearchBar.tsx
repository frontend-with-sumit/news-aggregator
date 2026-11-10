import { useEffect, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectActiveSearchParams, setKeyword } from '@/features/search/searchParamsSlice';
import './SearchBar.css';

const DEBOUNCE_MS = 400;

export function SearchBar() {
  const dispatch = useAppDispatch();
  const activeKeyword = useAppSelector((state) => selectActiveSearchParams(state).keyword);
  const [text, setText] = useState(activeKeyword);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (text !== activeKeyword) {
        dispatch(setKeyword(text));
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className="search-bar">
      <label className="search-bar__label" htmlFor="search-bar-input">
        Search articles
      </label>
      <div className="search-bar__field">
        <FiSearch className="search-bar__icon" size={20} aria-hidden="true" />
        <input
          id="search-bar-input"
          type="search"
          className="search-bar__input"
          placeholder="Search by keyword…"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </div>
    </div>
  );
}
