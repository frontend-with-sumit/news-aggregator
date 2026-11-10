import {
  CATEGORIES,
  NEWS_SOURCES,
  SOURCE_IDS,
  type Category,
  type SourceId,
} from '@/services/news';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  selectActivePreferences,
  toggleCategory,
  toggleSource,
} from '@/features/preferences/preferencesSlice';
import './FilterChips.css';

function Chip({
  label,
  active,
  disabled,
  onToggle,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="filter-chip"
      aria-pressed={active}
      disabled={disabled}
      onClick={onToggle}
    >
      {label}
    </button>
  );
}

export function FilterChips() {
  const dispatch = useAppDispatch();
  const { preferredSources, preferredCategories } = useAppSelector(selectActivePreferences);

  return (
    <div className="filter-chips">
      <div className="filter-chips__group">
        <span className="filter-chips__group-label">Sources</span>
        <div className="filter-chips__row">
          {SOURCE_IDS.map((sourceId: SourceId) => {
            const active = preferredSources.includes(sourceId);
            const isLastSelected = active && preferredSources.length === 1;
            return (
              <Chip
                key={sourceId}
                label={NEWS_SOURCES[sourceId].label}
                active={active}
                disabled={isLastSelected}
                onToggle={() => dispatch(toggleSource(sourceId))}
              />
            );
          })}
        </div>
      </div>
      <div className="filter-chips__group">
        <span className="filter-chips__group-label">Categories</span>
        <div className="filter-chips__row">
          {CATEGORIES.map((category: Category) => {
            const active = preferredCategories.includes(category);
            const isLastSelected = active && preferredCategories.length === 1;
            return (
              <Chip
                key={category}
                label={category}
                active={active}
                disabled={isLastSelected}
                onToggle={() => dispatch(toggleCategory(category))}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
