// Simple SearchComponent stub
import React from 'react';

interface SearchComponentProps {
  onSearch: (query: string, type: any) => void;
  isLoading: boolean;
  recentSearches: any[];
  placeholder?: string;
  autoFocus?: boolean;
  showProgress?: boolean;
  loadingMessage?: string;
}

const SearchComponent: React.FC<SearchComponentProps> = ({
  onSearch,
  isLoading,
  placeholder = "Enter tracking number...",
}) => {
  const [query, setQuery] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), 'container');
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h3>Search Component</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          style={{ padding: '8px', marginRight: '10px', width: '300px' }}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !query.trim()}>
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </form>
    </div>
  );
};

export default SearchComponent;