import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { SearchResultsPage } from '@/features/search/pages/SearchResultsPage';
import { ArticleDetailPage } from '@/features/search/pages/ArticleDetailPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SearchResultsPage />} />
        <Route path="/article/:id" element={<ArticleDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}
