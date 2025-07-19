import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PerformanceMonitor from './PerformanceMonitor';

// Mock performance API
const mockPerformance = {
  getEntriesByType: vi.fn(),
  now: vi.fn(() => 1000),
};

// Mock PerformanceObserver
const mockPerformanceObserver = vi.fn();
mockPerformanceObserver.prototype.observe = vi.fn();
mockPerformanceObserver.prototype.disconnect = vi.fn();

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

Object.defineProperty(global, 'PerformanceObserver', {
  value: mockPerformanceObserver,
  writable: true,
});

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformance.getEntriesByType.mockReturnValue([]);
  });

  it('renders without crashing', () => {
    expect(() => {
      render(<PerformanceMonitor />);
    }).not.toThrow();
  });

  it('calls onMetrics callback when provided', () => {
    const mockOnMetrics = vi.fn();
    
    // Mock navigation timing
    mockPerformance.getEntriesByType.mockReturnValue([
      {
        loadEventEnd: 2000,
        fetchStart: 1000,
        domContentLoadedEventEnd: 1500,
      },
    ]);

    render(<PerformanceMonitor onMetrics={mockOnMetrics} />);

    // Should call onMetrics with performance data
    expect(mockOnMetrics).toHaveBeenCalled();
  });

  it('handles missing performance API gracefully', () => {
    // Temporarily remove performance API
    const originalPerformance = global.performance;
    delete (global as any).performance;

    expect(() => {
      render(<PerformanceMonitor enableLogging={true} />);
    }).not.toThrow();

    // Restore performance API
    global.performance = originalPerformance;
  });

  it('enables logging when enableLogging is true', () => {
    const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    
    render(<PerformanceMonitor enableLogging={true} />);
    
    // Should log performance metrics
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  it('creates performance observers when available', () => {
    render(<PerformanceMonitor />);
    
    // Should create performance observers
    expect(mockPerformanceObserver).toHaveBeenCalled();
  });
});