import './Pagination.css';

export function Pagination({
  page,
  canGoNext,
  disabled,
  onPrevious,
  onNext,
}: {
  page: number;
  canGoNext: boolean;
  disabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <nav className="pagination" aria-label="Search results pages">
      <button
        type="button"
        className="pagination__button"
        onClick={onPrevious}
        disabled={disabled || page <= 1}
      >
        Previous
      </button>
      <span className="pagination__page">Page {page}</span>
      <button
        type="button"
        className="pagination__button"
        onClick={onNext}
        disabled={disabled || !canGoNext}
      >
        Next
      </button>
    </nav>
  );
}
