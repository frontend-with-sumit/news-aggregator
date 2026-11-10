import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectActiveSearchParams, setDateRange } from '@/features/search/searchParamsSlice';
import './DateRangeFilter.css';

export function DateRangeFilter() {
  const dispatch = useAppDispatch();
  const { from, to } = useAppSelector(selectActiveSearchParams);

  return (
    <div className="date-range-filter">
      <label className="date-range-filter__field">
        <span className="date-range-filter__label">From</span>
        <input
          type="date"
          className="date-range-filter__input"
          value={from ?? ''}
          max={to}
          onChange={(event) => dispatch(setDateRange({ from: event.target.value, to }))}
        />
      </label>
      <label className="date-range-filter__field">
        <span className="date-range-filter__label">To</span>
        <input
          type="date"
          className="date-range-filter__input"
          value={to ?? ''}
          min={from}
          onChange={(event) => dispatch(setDateRange({ from, to: event.target.value }))}
        />
      </label>
    </div>
  );
}
