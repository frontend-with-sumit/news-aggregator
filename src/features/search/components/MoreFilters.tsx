import { AuthorFilter } from './AuthorFilter';
import { DateRangeFilter } from './DateRangeFilter';
import './MoreFilters.css';

export function MoreFilters() {
  return (
    <details className="more-filters">
      <summary className="more-filters__summary">More filters</summary>
      <div className="more-filters__body">
        <AuthorFilter />
        <DateRangeFilter />
      </div>
    </details>
  );
}
