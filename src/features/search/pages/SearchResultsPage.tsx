import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useSearchArticlesQuery } from '@/features/news/newsApi';
import { selectActiveSearchParams, setPage } from '@/features/search/searchParamsSlice';
import { ThemeToggle } from '@/app/ThemeToggle';
import { SearchBar } from '@/features/search/components/SearchBar';
import { FilterChips } from '@/features/search/components/FilterChips';
import { StatusBanner } from '@/features/search/components/StatusBanner';
import { ArticleList } from '@/features/search/components/ArticleList';
import { Pagination } from '@/features/search/components/Pagination';
import './SearchResultsPage.css';

export function SearchResultsPage() {
  const dispatch = useAppDispatch();
  const searchParams = useAppSelector(selectActiveSearchParams);
  const { data, error, isFetching } = useSearchArticlesQuery(searchParams);

  const articles = data?.articles ?? [];
  const sourceErrors =
    data?.sourceErrors ?? (error && 'sourceErrors' in error ? error.sourceErrors : []);

  return (
    <main className="search-results-page">
      <header className="search-results-page__header">
        <div className="search-results-page__heading">
          <h1>News Aggregator</h1>
          <span className="search-results-page__badge">Your sources, your topics</span>
        </div>
        <ThemeToggle />
      </header>
      <SearchBar />
      <FilterChips />
      <StatusBanner sourceErrors={sourceErrors} />
      <ArticleList articles={articles} isFetching={isFetching} />
      <Pagination
        page={searchParams.page}
        canGoNext={articles.length > 0}
        disabled={isFetching}
        onPrevious={() => dispatch(setPage(searchParams.page - 1))}
        onNext={() => dispatch(setPage(searchParams.page + 1))}
      />
    </main>
  );
}
