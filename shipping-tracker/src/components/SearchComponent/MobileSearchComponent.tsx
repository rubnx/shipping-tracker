import { useState, useRef, useEffect } from 'react';
import { SearchComponentProps } from '../../types';

interface MobileSearchComponentProps extends SearchComponentProps {
  onFocus?: () => void;
  onBlur?: () => void;
  showKeyboardHints?: boolean;
  enableVoiceSearch?: boolean;
  onVoiceSearch?: () => void;
}

/**
 * Mobile-optimized search component with enhanced touch support
 * Implements Requirements 4.1, 4.2, 4.3, 4.4 for mobile search experience
 */
export function MobileSearchComponent({
  value,
  onChange,
  onSubmit,
  onClear,
  placeholder = 'Enter tracking number',
  isLoading = false,
  error,
  suggestions = [],
  onSuggestionSelect,
  className = '',
  onFocus,
  onBlur,
  showKeyboardHints = true,
  enableVoiceSearch = false,
  onVoiceSearch,
}: MobileSearchComponentProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isVoiceSearchActive, setIsVoiceSearchActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Handle input focus
  const handleFocus = () => {
    setIsFocused(true);
    setShowSuggestions(suggestions.length > 0);
    onFocus?.();
  };

  // Handle input blur
  const handleBlur = () => {
    // Delay to allow suggestion clicks
    setTimeout(() => {
      setIsFocused(false);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      onBlur?.();
    }, 150);
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowSuggestions(suggestions.length > 0 && newValue.length > 0);
    setSelectedSuggestionIndex(-1);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  // Handle clear
  const handleClear = () => {
    onChange('');
    onClear?.();
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    inputRef.current?.focus();
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: string) => {
    onChange(suggestion);
    onSuggestionSelect?.(suggestion);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    inputRef.current?.blur();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          handleSuggestionSelect(suggestions[selectedSuggestionIndex]);
        } else {
          handleSubmit(e);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle voice search
  const handleVoiceSearch = () => {
    if (!enableVoiceSearch) return;
    
    setIsVoiceSearchActive(true);
    onVoiceSearch?.();
    
    // Simulate voice search completion
    setTimeout(() => {
      setIsVoiceSearchActive(false);
    }, 3000);
  };

  // Auto-resize input on mobile
  useEffect(() => {
    if (inputRef.current && isFocused) {
      // Prevent zoom on iOS by ensuring font-size is at least 16px
      inputRef.current.style.fontSize = '16px';
    }
  }, [isFocused]);

  return (
    <div className={`relative w-full ${className}`}>
      {/* Search Form */}
      <form onSubmit={handleSubmit} className=\"relative\">
        <div className=\"relative\">
          {/* Search Input */}
          <input
            ref={inputRef}
            type=\"text\"
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`
              w-full pl-12 pr-20 py-4 text-base
              bg-white border-2 rounded-xl
              transition-all duration-200 ease-in-out
              touch-manipulation
              ${isFocused 
                ? 'border-blue-500 bg-white shadow-lg ring-4 ring-blue-100' 
                : error 
                ? 'border-red-300 bg-red-50' 
                : 'border-gray-300 bg-gray-50'
              }
              ${isLoading ? 'pr-24' : ''}
              focus:outline-none
              placeholder-gray-500
            `}
            disabled={isLoading}
            autoComplete=\"off\"
            autoCapitalize=\"off\"
            autoCorrect=\"off\"
            spellCheck=\"false\"
            inputMode=\"text\"
          />

          {/* Search Icon */}
          <div className=\"absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none\">
            <svg className=\"w-5 h-5 text-gray-400\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
              <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z\" />
            </svg>
          </div>

          {/* Right Side Controls */}
          <div className=\"absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1\">
            {/* Loading Spinner */}
            {isLoading && (
              <div className=\"w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin\" />
            )}

            {/* Voice Search Button */}
            {enableVoiceSearch && !isLoading && (
              <button
                type=\"button\"
                onClick={handleVoiceSearch}
                className={`
                  p-2 rounded-lg transition-colors duration-150 touch-manipulation
                  ${isVoiceSearchActive 
                    ? 'bg-red-100 text-red-600' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }
                `}
                aria-label=\"Voice search\"
              >
                <svg className=\"w-4 h-4\" fill=\"currentColor\" viewBox=\"0 0 20 20\">
                  <path fillRule=\"evenodd\" d=\"M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z\" clipRule=\"evenodd\" />
                </svg>
              </button>
            )}

            {/* Clear Button */}
            {value && !isLoading && (
              <button
                type=\"button\"
                onClick={handleClear}
                className=\"p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors duration-150 touch-manipulation\"
                aria-label=\"Clear search\"
              >
                <svg className=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                  <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M6 18L18 6M6 6l12 12\" />
                </svg>
              </button>
            )}

            {/* Search Button */}
            {!isLoading && (
              <button
                type=\"submit\"
                disabled={!value.trim()}
                className={`
                  p-2 rounded-lg transition-colors duration-150 touch-manipulation
                  ${value.trim() 
                    ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }
                `}
                aria-label=\"Search\"
              >
                <svg className=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                  <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z\" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className=\"mt-2 flex items-center space-x-2 text-red-600\">
            <svg className=\"w-4 h-4 flex-shrink-0\" fill=\"currentColor\" viewBox=\"0 0 20 20\">
              <path fillRule=\"evenodd\" d=\"M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z\" clipRule=\"evenodd\" />
            </svg>
            <span className=\"text-sm\">{error}</span>
          </div>
        )}

        {/* Keyboard Hints */}
        {showKeyboardHints && isFocused && !showSuggestions && (
          <div className=\"mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg\">
            <div className=\"text-xs text-blue-800\">
              <p className=\"font-medium mb-1\">💡 Search Tips:</p>
              <ul className=\"space-y-1 text-blue-700\">
                <li>• Enter container number (e.g., ABCD1234567)</li>
                <li>• Enter booking number (e.g., ABC123456789)</li>
                <li>• Enter bill of lading number</li>
              </ul>
            </div>
          </div>
        )}
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className=\"absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto\"
        >
          <div className=\"py-2\">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type=\"button\"
                onClick={() => handleSuggestionSelect(suggestion)}
                className={`
                  w-full px-4 py-3 text-left text-sm transition-colors duration-150 touch-manipulation
                  ${index === selectedSuggestionIndex 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <div className=\"flex items-center space-x-3\">
                  <svg className=\"w-4 h-4 text-gray-400\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                    <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z\" />
                  </svg>
                  <span className=\"flex-1 truncate\">{suggestion}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Voice Search Feedback */}
      {isVoiceSearchActive && (
        <div className=\"absolute top-full left-0 right-0 mt-1 p-4 bg-red-50 border border-red-200 rounded-lg shadow-lg z-50\">
          <div className=\"flex items-center space-x-3\">
            <div className=\"w-4 h-4 bg-red-500 rounded-full animate-pulse\" />
            <span className=\"text-sm text-red-700 font-medium\">Listening...</span>
          </div>
          <p className=\"text-xs text-red-600 mt-1\">Speak your tracking number clearly</p>
        </div>
      )}
    </div>
  );
}

export default MobileSearchComponent;