import React, { useState, useEffect, useRef } from 'react';
import type { 
  TrackingType, 
  SearchComponentProps, 
  SearchComponentState,
  SearchHistoryItem 
} from '../../types';
import { 
  validateTrackingNumber
} from '../../utils';
import { FORMAT_EXAMPLES } from '../../types/constants';
import { LoadingStateManager } from '../LoadingStates/LoadingStateManager';
import { useIsMobile, useIsTouchDevice, useScreenReader, useDebounce, useComponentPerformance } from '../../hooks';

const SearchComponent: React.FC<SearchComponentProps> = ({
  onSearch,
  isLoading,
  recentSearches,
  placeholder = "Enter tracking number...",
  autoFocus = false,
  className = "",
  loadingMessage = "Searching for tracking information...",
  showProgress = false,
}) => {
  const [state, setState] = useState<SearchComponentState>({
    query: '',
    detectedType: null,
    validationError: null,
    showSuggestions: false,
    selectedSuggestionIndex: -1,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // Performance tracking
  useComponentPerformance('SearchComponent', true);
  
  // Responsive hooks
  const isMobile = useIsMobile();
  const isTouch = useIsTouchDevice();
  const { announce } = useScreenReader();
  
  // Debounce validation for better performance
  const debouncedQuery = useDebounce(state.query, 300);

  // Validation effect with debounced query
  useEffect(() => {
    if (debouncedQuery.trim()) {
      const validation = validateTrackingNumber(debouncedQuery);
      setState(prev => ({
        ...prev,
        validationError: validation.isValid ? null : validation.error || null,
        detectedType: validation.detectedType || null,
      }));
      
      // Announce validation results to screen readers
      if (validation.isValid && validation.detectedType) {
        announce(`${getTrackingTypeDisplay(validation.detectedType)} detected`);
      } else if (!validation.isValid && validation.error) {
        announce(`Validation error: ${validation.error}`);
      }
    } else {
      setState(prev => ({
        ...prev,
        validationError: null,
        detectedType: null,
      }));
    }
  }, [debouncedQuery, announce]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setState(prev => ({
      ...prev,
      query,
      showSuggestions: query.length > 0 && recentSearches.length > 0,
    }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!state.query.trim()) {
      setState(prev => ({
        ...prev,
        validationError: 'Please enter a tracking number',
      }));
      return;
    }

    const validation = validateTrackingNumber(state.query);
    
    if (!validation.isValid) {
      setState(prev => ({
        ...prev,
        validationError: validation.error || 'Invalid tracking number format',
      }));
      return;
    }

    // Clear suggestions and perform search
    setState(prev => ({
      ...prev,
      showSuggestions: false,
      selectedSuggestionIndex: -1,
    }));

    onSearch(state.query.trim(), validation.detectedType!);
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: SearchHistoryItem) => {
    setState(prev => ({
      ...prev,
      query: suggestion.trackingNumber,
      showSuggestions: false,
      selectedSuggestionIndex: -1,
      detectedType: suggestion.trackingType,
      validationError: null,
    }));

    onSearch(suggestion.trackingNumber, suggestion.trackingType);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!state.showSuggestions || recentSearches.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setState(prev => ({
          ...prev,
          selectedSuggestionIndex: Math.min(
            prev.selectedSuggestionIndex + 1,
            recentSearches.length - 1
          ),
        }));
        break;

      case 'ArrowUp':
        e.preventDefault();
        setState(prev => ({
          ...prev,
          selectedSuggestionIndex: Math.max(prev.selectedSuggestionIndex - 1, -1),
        }));
        break;

      case 'Enter':
        if (state.selectedSuggestionIndex >= 0) {
          e.preventDefault();
          handleSuggestionClick(recentSearches[state.selectedSuggestionIndex]);
        }
        break;

      case 'Escape':
        setState(prev => ({
          ...prev,
          showSuggestions: false,
          selectedSuggestionIndex: -1,
        }));
        break;
    }
  };

  // Handle input focus
  const handleFocus = () => {
    if (state.query.length > 0 && recentSearches.length > 0) {
      setState(prev => ({ ...prev, showSuggestions: true }));
    }
  };

  // Handle input blur
  const handleBlur = (e: React.FocusEvent) => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(e.relatedTarget as Node)) {
        setState(prev => ({
          ...prev,
          showSuggestions: false,
          selectedSuggestionIndex: -1,
        }));
      }
    }, 150);
  };

  // Filter suggestions based on query
  const filteredSuggestions = recentSearches.filter(item =>
    item.trackingNumber.toLowerCase().includes(state.query.toLowerCase())
  );

  // Auto-focus effect
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Get tracking type display
  const getTrackingTypeDisplay = (type: TrackingType) => {
    switch (type) {
      case 'container':
        return 'Container Number';
      case 'booking':
        return 'Booking Number';
      case 'bol':
        return 'Bill of Lading';
      default:
        return '';
    }
  };



  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={state.query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={placeholder}
              className={`input-field pr-12 ${
                state.validationError ? 'border-red-500 focus:ring-red-500' : ''
              } ${isLoading ? 'opacity-50' : ''} ${
                isMobile ? 'text-base' : 'text-sm'
              }`}
              disabled={isLoading}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              inputMode={isMobile ? 'text' : undefined}
              aria-describedby={
                state.validationError ? 'search-error' : 
                state.detectedType ? 'detected-type' : 'format-examples'
              }
              aria-invalid={state.validationError ? 'true' : 'false'}
              aria-expanded={state.showSuggestions}
              aria-haspopup="listbox"
              role="combobox"
              aria-autocomplete="list"
            />
            
            {/* Search Button */}
            <button
              type="submit"
              disabled={isLoading || !!state.validationError}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              aria-label="Search"
            >
              {isLoading ? (
                <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full" />
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </button>
          </div>

          {/* Suggestions Dropdown */}
          {state.showSuggestions && filteredSuggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className={`absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-y-auto ${
                isMobile ? 'max-h-48' : 'max-h-60'
              }`}
              role="listbox"
              aria-label="Search suggestions"
            >
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={suggestion.trackingNumber}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 last:border-b-0 transition-colors duration-150 ${
                    index === state.selectedSuggestionIndex ? 'bg-primary-50' : ''
                  } ${isTouch ? 'touch-manipulation' : ''}`}
                  role="option"
                  aria-selected={index === state.selectedSuggestionIndex}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-900">
                        {suggestion.trackingNumber}
                      </div>
                      <div className="text-sm text-gray-500">
                        {getTrackingTypeDisplay(suggestion.trackingType)}
                        {suggestion.carrier && ` • ${suggestion.carrier}`}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {suggestion.searchCount > 1 && `${suggestion.searchCount}x`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Validation Error */}
        {state.validationError && (
          <div id="search-error" className="text-red-600 text-sm flex items-center">
            <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {state.validationError}
          </div>
        )}

        {/* Detected Type */}
        {state.detectedType && !state.validationError && (
          <div id="detected-type" className="text-green-600 text-sm flex items-center">
            <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {getTrackingTypeDisplay(state.detectedType)} detected
          </div>
        )}

        {/* Format Examples */}
        {!state.query && (
          <div id="format-examples" className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            <div className="font-medium mb-2">Supported formats:</div>
            <div className="space-y-1" role="list">
              <div role="listitem">• Container: {FORMAT_EXAMPLES.container}</div>
              <div role="listitem">• Booking: {FORMAT_EXAMPLES.booking}</div>
              <div role="listitem">• Bill of Lading: {FORMAT_EXAMPLES.bol}</div>
            </div>
          </div>
        )}
      </form>

      {/* Enhanced Loading State Manager */}
      <LoadingStateManager
        isLoading={isLoading}
        trackingNumber={state.query}
        loadingType="search-results"
        className="mt-6"
        variant="auto"
        showProviderDetails={true}
        showTimeoutHandler={true}
        timeoutMs={30000}
        onCancel={() => {
          // Handle cancel - could emit an event or call a prop function
          console.log('Search cancelled by user');
        }}
        onRetry={() => {
          // Handle retry - restart the search
          if (state.query.trim()) {
            const validation = validateTrackingNumber(state.query);
            if (validation.isValid) {
              onSearch(state.query.trim(), validation.detectedType!);
            }
          }
        }}
        onSwitchToDemo={() => {
          // Handle demo mode switch
          console.log('Switching to demo mode');
        }}
      />
    </div>
  );
};

export default SearchComponent;