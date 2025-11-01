import React from 'react';
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
  filters,
  onFiltersChange
}: SearchBarProps) {
  const clearSearch = () => {
    onSearchChange('');
    onFiltersChange({});
  };

  const hasContent = searchQuery.length > 0;

  return (
    <div className="relative w-full">
      <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-2.5 shadow-inner border border-gray-300 dark:border-gray-600 hover:shadow-md transition-shadow">
        <Search className="w-5 h-5 text-gray-500 flex-shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher dans les messages"
          className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 placeholder-gray-500 ml-3"
        />
        {hasContent && (
          <button
            onClick={clearSearch}
            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>
    </div>
  );
}
