import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchComponent from './SearchComponent';
import type { SearchComponentProps, SearchHistoryItem } from '../../types';

// Mock the utils
vi.mock('../../utils', () => ({
  validateTrackingNumber: vi.fn(),
  debounce: vi.fn((fn) => fn), // Return function immediately for testing
}));

// Mock the constants
vi.mock('../../types/constants', () => ({
  FORMAT_EXAMPLES: {
    container: 'ABCD1234567',
    booking: 'ABC123456789',
    bol: 'ABCD123456789012',
  },
}));

const mockValidateTrackingNumber = vi.mocked(
  await import('../../utils')
).validateTrackingNumber;

describe('SearchComponent', () => {
  const mockOnSearch = vi.fn();
  const mockRecentSearches: SearchHistoryItem[] = [
    {
      trackingNumber: 'ABCD1234567',
      trackingType: 'container',
      searchCount: 2,
      lastSearched: new Date(),
      carrier: 'Maersk',
    },
    {
      trackingNumber: 'ABC123456789',
      trackingType: 'booking',
      searchCount: 1,
      lastSearched: new Date(),
    },
  ];

  const defaultProps: SearchComponentProps = {
    onSearch: mockOnSearch,
    isLoading: false,
    recentSearches: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render search input with placeholder', () => {
      render(<SearchComponent {...defaultProps} />);
      
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter tracking number...')).toBeInTheDocument();
    });

    it('should render custom placeholder when provided', () => {
      render(<SearchComponent {...defaultProps} placeholder="Custom placeholder" />);
      
      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    });

    it('should render search button', () => {
      render(<SearchComponent {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    });

    it('should show format examples when input is empty', () => {
      render(<SearchComponent {...defaultProps} />);
      
      expect(screen.getByText('Supported formats:')).toBeInTheDocument();
      expect(screen.getByText(/Container: ABCD1234567/)).toBeInTheDocument();
      expect(screen.getByText(/Booking: ABC123456789/)).toBeInTheDocument();
      expect(screen.getByText(/Bill of Lading: ABCD123456789012/)).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <SearchComponent {...defaultProps} className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Input Handling', () => {
    it('should update input value when typing', async () => {
      const user = userEvent.setup();
      mockValidateTrackingNumber.mockReturnValue({
        isValid: true,
        detectedType: 'container',
      });
      
      render(<SearchComponent {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'ABCD1234567');
      
      expect(input).toHaveValue('ABCD1234567');
    });

    it('should call validation when typing', async () => {
      const user = userEvent.setup();
      mockValidateTrackingNumber.mockReturnValue({
        isValid: true,
        detectedType: 'container',
      });
      
      render(<SearchComponent {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'ABCD1234567');
      
      await waitFor(() => {
        expect(mockValidateTrackingNumber).toHaveBeenCalledWith('ABCD1234567');
      });
    });

    it('should hide format examples when typing', async () => {
      const user = userEvent.setup();
      render(<SearchComponent {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'A');
      
      expect(screen.queryByText('Supported formats:')).not.toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should show detected type when valid', async () => {
      const user = userEvent.setup();
      mockValidateTrackingNumber.mockReturnValue({
        isValid: true,
        detectedType: 'container',
      });
      
      render(<SearchComponent {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'ABCD1234567');
      
      await waitFor(() => {
        expect(screen.getByText('Container Number detected')).toBeInTheDocument();
      });
    });

    it('should show validation error when invalid', async () => {
      const user = userEvent.setup();
      mockValidateTrackingNumber.mockReturnValue({
        isValid: false,
        error: 'Invalid tracking number format',
      });
      
      render(<SearchComponent {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'invalid');
      
      await waitFor(() => {
        expect(screen.getByText('Invalid tracking number format')).toBeInTheDocument();
      });
    });

    it('should show error icon with validation error', async () => {
      const user = userEvent.setup();
      mockValidateTrackingNumber.mockReturnValue({
        isValid: false,
        error: 'Invalid format',
      });
      
      render(<SearchComponent {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'invalid');
      
      await waitFor(() => {
        const errorElement = screen.getByText('Invalid format');
        expect(errorElement.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should show success icon with detected type', async () => {
      const user = userEvent.setup();
      mockValidateTrackingNumber.mockReturnValue({
        isValid: true,
        detectedType: 'booking',
      });
      
      render(<SearchComponent {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'ABC123456789');
      
      await waitFor(() => {
        const successElement = screen.getByText('Booking Number detected');
        expect(successElement.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call onSearch with valid input', async () => {
      const user = userEvent.setup();
      mockValidateTrackingNumber.mockReturnValue({
        isValid: true,
        detectedType: 'container',
      });
      
      render(<SearchComponent {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      const submitButton = screen.getByRole('button', { name: 'Search' });
      
      await user.type(input, 'ABCD1234567');
      await user.click(submitButton);
      
      expect(mockOnSearch).toHaveBeenCalledWith('ABCD1234567', 'container');
    });

    it('should call onSearch on form submit (Enter key)', async () => {
      const user = userEvent.setup();
      mockValidateTrackingNumber.mockReturnValue({
        isValid: true,
        detectedType: 'booking',
      });
      
      render(<SearchComponent {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'ABC123456789');
      await user.keyboard('{Enter}');
      
      expect(mockOnSearch).toHaveBeenCalledWith('ABC123456789', 'booking');
    });

    it('should not call onSearch with empty input', async () => {
      const user = userEvent.setup();
      render(<SearchComponent {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: 'Search' });
      await user.click(submitButton);
      
      expect(mockOnSearch).not.toHaveBeenCalled();
      expect(screen.getByText('Please enter a tracking number')).toBeInTheDocument();
    });

    it('should not call onSearch with invalid input', async () => {
      const user = userEvent.setup();
      mockValidateTrackingNumber.mockReturnValue({
        isValid: false,
        error: 'Invalid format',
      });
      
      render(<SearchComponent {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      const submitButton = screen.getByRole('button', { name: 'Search' });
      
      await user.type(input, 'invalid');
      await user.click(submitButton);
      
      expect(mockOnSearch).not.toHaveBeenCalled();
    });

    it('should trim whitespace from input', async () => {
      const user = userEvent.setup();
      mockValidateTrackingNumber.mockReturnValue({
        isValid: true,
        detectedType: 'container',
      });
      
      render(<SearchComponent {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      const submitButton = screen.getByRole('button', { name: 'Search' });
      
      await user.type(input, '  ABCD1234567  ');
      await user.click(submitButton);
      
      expect(mockOnSearch).toHaveBeenCalledWith('ABCD1234567', 'container');
    });
  });

  describe('Loading State', () => {
    it('should disable input when loading', () => {
      render(<SearchComponent {...defaultProps} isLoading={true} />);
      
      const input = screen.getByRole('combobox');
      expect(input).toBeDisabled();
    });

    it('should disable submit button when loading', () => {
      render(<SearchComponent {...defaultProps} isLoading={true} />);
      
      const submitButton = screen.getByRole('button', { name: 'Search' });
      expect(submitButton).toBeDisabled();
    });

    it('should show loading spinner when loading', () => {
      render(<SearchComponent {...defaultProps} isLoading={true} />);
      
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should show search icon when not loading', () => {
      render(<SearchComponent {...defaultProps} isLoading={false} />);
      
      const searchIcon = screen.getByRole('button', { name: 'Search' }).querySelector('svg');
      expect(searchIcon).toBeInTheDocument();
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
  });

  describe('Search History', () => {
    it('should show suggestions when typing with history', async () => {
      const user = userEvent.setup();
      render(<SearchComponent {...defaultProps} recentSearches={mockRecentSearches} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'A');
      
      await waitFor(() => {
        expect(screen.getByText('ABCD1234567')).toBeInTheDocument();
        expect(screen.getByText('ABC123456789')).toBeInTheDocument();
      });
    });

    it('should filter suggestions based on input', async () => {
      const user = userEvent.setup();
      render(<SearchComponent {...defaultProps} recentSearches={mockRecentSearches} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'ABCD');
      
      await waitFor(() => {
        expect(screen.getByText('ABCD1234567')).toBeInTheDocument();
        expect(screen.queryByText('ABC123456789')).not.toBeInTheDocument();
      });
    });

    it('should show tracking type in suggestions', async () => {
      const user = userEvent.setup();
      render(<SearchComponent {...defaultProps} recentSearches={mockRecentSearches} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'A');
      
      await waitFor(() => {
        expect(screen.getByText((_content, element) => {
          return element?.textContent === 'Container Number • Maersk';
        })).toBeInTheDocument();
        expect(screen.getByText((_content, element) => {
          return element?.textContent === 'Booking Number';
        })).toBeInTheDocument();
      });
    });

    it('should show carrier in suggestions when available', async () => {
      const user = userEvent.setup();
      render(<SearchComponent {...defaultProps} recentSearches={mockRecentSearches} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'ABCD');
      
      await waitFor(() => {
        expect(screen.getByText(/Maersk/)).toBeInTheDocument();
      });
    });

    it('should show search count when greater than 1', async () => {
      const user = userEvent.setup();
      render(<SearchComponent {...defaultProps} recentSearches={mockRecentSearches} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'ABCD');
      
      await waitFor(() => {
        expect(screen.getByText('2x')).toBeInTheDocument();
      });
    });

    it('should call onSearch when clicking suggestion', async () => {
      const user = userEvent.setup();
      render(<SearchComponent {...defaultProps} recentSearches={mockRecentSearches} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'A');
      
      await waitFor(() => {
        const suggestion = screen.getByText('ABCD1234567');
        expect(suggestion).toBeInTheDocument();
      });
      
      const suggestionButton = screen.getByText('ABCD1234567').closest('button');
      await user.click(suggestionButton!);
      
      expect(mockOnSearch).toHaveBeenCalledWith('ABCD1234567', 'container');
    });

    it('should hide suggestions on blur', async () => {
      const user = userEvent.setup();
      render(<SearchComponent {...defaultProps} recentSearches={mockRecentSearches} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'A');
      
      await waitFor(() => {
        expect(screen.getByText('ABCD1234567')).toBeInTheDocument();
      });
      
      await user.tab(); // Move focus away
      
      await waitFor(() => {
        expect(screen.queryByText('ABCD1234567')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate suggestions with arrow keys', async () => {
      const user = userEvent.setup();
      render(<SearchComponent {...defaultProps} recentSearches={mockRecentSearches} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'A');
      
      await waitFor(() => {
        expect(screen.getByText('ABCD1234567')).toBeInTheDocument();
      });
      
      await user.keyboard('{ArrowDown}');
      
      // First suggestion should be highlighted
      const firstSuggestion = screen.getByText('ABCD1234567').closest('button');
      expect(firstSuggestion).toHaveClass('bg-primary-50');
    });

    it('should select suggestion with Enter key', async () => {
      const user = userEvent.setup();
      render(<SearchComponent {...defaultProps} recentSearches={mockRecentSearches} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'A');
      
      await waitFor(() => {
        expect(screen.getByText('ABCD1234567')).toBeInTheDocument();
      });
      
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');
      
      expect(mockOnSearch).toHaveBeenCalledWith('ABCD1234567', 'container');
    });

    it('should hide suggestions with Escape key', async () => {
      const user = userEvent.setup();
      render(<SearchComponent {...defaultProps} recentSearches={mockRecentSearches} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'A');
      
      await waitFor(() => {
        expect(screen.getByText('ABCD1234567')).toBeInTheDocument();
      });
      
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByText('ABCD1234567')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for error state', async () => {
      const user = userEvent.setup();
      mockValidateTrackingNumber.mockReturnValue({
        isValid: false,
        error: 'Invalid format',
      });
      
      render(<SearchComponent {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'invalid');
      
      await waitFor(() => {
        expect(input).toHaveAttribute('aria-describedby', 'search-error');
      });
    });

    it('should have proper ARIA attributes for detected type', async () => {
      const user = userEvent.setup();
      mockValidateTrackingNumber.mockReturnValue({
        isValid: true,
        detectedType: 'container',
      });
      
      render(<SearchComponent {...defaultProps} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'ABCD1234567');
      
      await waitFor(() => {
        expect(input).toHaveAttribute('aria-describedby', 'detected-type');
      });
    });

    it('should have proper button labels', () => {
      render(<SearchComponent {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: 'Search' });
      expect(submitButton).toHaveAttribute('aria-label', 'Search');
    });
  });

  describe('Auto Focus', () => {
    it('should auto focus input when autoFocus is true', () => {
      render(<SearchComponent {...defaultProps} autoFocus={true} />);
      
      const input = screen.getByRole('combobox');
      expect(input).toHaveFocus();
    });

    it('should not auto focus input when autoFocus is false', () => {
      render(<SearchComponent {...defaultProps} autoFocus={false} />);
      
      const input = screen.getByRole('combobox');
      expect(input).not.toHaveFocus();
    });
  });
});