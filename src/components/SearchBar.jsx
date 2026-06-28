import { useState, useEffect, useRef, useCallback } from 'react';
import './SearchBar.css';

const SearchBar = ({ onSearch, isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Auto-focus when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (!isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Debounced search
  const debouncedSearch = useCallback(
    (value) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSearch(value);
      }, 300);
    },
    [onSearch]
  );

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
    onClose();
  };

  return (
    <>
      <div
        className={`search-bar-overlay ${isOpen ? 'open' : ''}`}
        onClick={handleClear}
        aria-hidden="true"
      />
      <div
        className={`search-bar ${isOpen ? 'open' : ''}`}
        role="search"
        aria-label="Search products"
      >
        <div className="search-bar__inner">
          <span className="search-bar__icon" aria-hidden="true">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>
          <input
            ref={inputRef}
            className="search-bar__input"
            type="text"
            placeholder="Search sarees, suits, styles..."
            value={query}
            onChange={handleChange}
            aria-label="Search products"
          />
          <button
            className="search-bar__close"
            onClick={handleClear}
            aria-label="Close search"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        {isOpen && query.length === 0 && (
          <p className="search-bar__hint">
            Start typing to search our collection
          </p>
        )}
      </div>
    </>
  );
};

export default SearchBar;
