import { CATEGORIES, SOURCE_IDS, type Category, type SourceId } from '@/services/news';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  selectActivePreferences,
  toggleCategory,
  toggleSource,
} from '@/features/preferences/preferencesSlice';
import './FilterChips.css';

function Chip<T extends string>({
  label,
  active,
  disabled,
  onToggle,
}: {
  label: T;
  active: boolean;
  disabled: boolean;
  onToggle: (value: T) => void;
}) {
  return (
    <button
      type="button"
      className="filter-chip"
      aria-pressed={active}
      disabled={disabled}
      onClick={() => onToggle(label)}
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
                label={sourceId}
                active={active}
                disabled={isLastSelected}
                onToggle={(value) => dispatch(toggleSource(value))}
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
                onToggle={(value) => dispatch(toggleCategory(value))}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
