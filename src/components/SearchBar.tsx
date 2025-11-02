import { Search, X } from 'lucide-react';
import { MessageFilters } from '../types/index.ts';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: MessageFilters;
  onFiltersChange: (filters: MessageFilters) => void;
}

export default function SearchBar({
  searchQuery,
  onSearchChange,
  onFiltersChange
}: SearchBarProps) {
  const clearSearch = () => {
    onSearchChange('');
    onFiltersChange({});
  };

  const hasContent = searchQuery.length > 0;

  return (
    <div className="relative w-full">
      <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-full px-4 shadow-inner border border-gray-300 dark:border-gray-600 hover:shadow-md transition-shadow" style={{ height: '42px', minHeight: '42px', maxHeight: '42px' }}>
        <Search className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 mr-2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher dans les messages"
          className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          style={{ lineHeight: '1.5', paddingTop: '4px', paddingBottom: '4px', margin: 0, height: 'auto' }}
        />
        {hasContent && (
          <button
            onClick={clearSearch}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
}
