import React, { useState, useEffect } from 'react';
import { performanceMonitoringService } from '../services/PerformanceMonitoringService';

interface PerformanceDashboardProps {
  onClose?: () => void;
  className?: string;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  onClose,
  className = ''
}) => {
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPerformanceData = () => {
      try {
        const data = performanceMonitoringService.getPerformanceReport();
        setPerformanceData(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load performance data:', error);
        setIsLoading(false);
      }
    };

    loadPerformanceData();
    
    // Refresh data every 10 seconds
    const interval = setInterval(loadPerformanceData, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const getScoreColor = (metric: string, value?: number) => {
    if (!value) return 'text-gray-400';
    
    const thresholds: Record<string, { good: number; poor: number }> = {
      FCP: { good: 1800, poor: 3000 },
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      TTFB: { good: 800, poor: 1800 },
      INP: { good: 200, poor: 500 },
    };

    const threshold = thresholds[metric];
    if (!threshold) return 'text-gray-600';

    if (value <= threshold.good) return 'text-green-600';
    if (value <= threshold.poor) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatValue = (metric: string, value?: number) => {
    if (!value) return 'N/A';
    
    if (metric === 'CLS') {
      return value.toFixed(3);
    }
    
    return `${Math.round(value)}ms`;
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading performance data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Performance Dashboard</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {performanceData && (
        <div className="space-y-6">
          {/* Core Web Vitals */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Core Web Vitals</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(performanceData.coreWebVitals).map(([metric, value]) => (
                <div key={metric} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-700">{metric}</div>
                  <div className={`text-lg font-semibold ${getScoreColor(metric, value as number)}`}>
                    {formatValue(metric, value as number)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* API Performance */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">API Performance</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-700">Avg Response</div>
                <div className="text-lg font-semibold text-blue-600">
                  {Math.round(performanceData.apiPerformance.averageResponseTime)}ms
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-700">Total Requests</div>
                <div className="text-lg font-semibold text-green-600">
                  {performanceData.apiPerformance.totalRequests}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-700">Error Rate</div>
                <div className={`text-lg font-semibold ${
                  performanceData.apiPerformance.errorRate > 5 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {performanceData.apiPerformance.errorRate.toFixed(1)}%
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-700">Endpoints</div>
                <div className="text-lg font-semibold text-gray-600">
                  {performanceData.apiPerformance.slowestEndpoints.length}
                </div>
              </div>
            </div>
          </div>

          {/* Slowest Endpoints */}
          {performanceData.apiPerformance.slowestEndpoints.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Slowest Endpoints</h4>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="space-y-2">
                  {performanceData.apiPerformance.slowestEndpoints.slice(0, 5).map((endpoint: any, index: number) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 truncate flex-1 mr-2">
                        {endpoint.url}
                      </span>
                      <span className="text-gray-600">
                        {Math.round(endpoint.averageTime)}ms ({endpoint.count})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Resource Metrics */}
          {performanceData.resourceMetrics.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Resource Loading</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {performanceData.resourceMetrics.map((resource: any, index: number) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm font-medium text-gray-700 capitalize">
                      {resource.name}
                    </div>
                    <div className="text-lg font-semibold text-blue-600">
                      {Math.round(resource.value)}ms
                    </div>
                    <div className="text-xs text-gray-500">
                      {resource.count} resources
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Budget Violations */}
          {performanceData.budgetViolations.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Performance Budget Violations</h4>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="space-y-2">
                  {performanceData.budgetViolations.map((violation: any, index: number) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-red-700 font-medium">
                        {violation.metric}
                      </span>
                      <span className="text-red-600">
                        {violation.violations} violations (avg +{Math.round(violation.averageExcess)}ms)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setIsLoading(true);
                setTimeout(() => {
                  const data = performanceMonitoringService.getPerformanceReport();
                  setPerformanceData(data);
                  setIsLoading(false);
                }, 500);
              }}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Refresh Data
            </button>
            <button
              onClick={() => {
                performanceMonitoringService.clearMetrics();
                const data = performanceMonitoringService.getPerformanceReport();
                setPerformanceData(data);
              }}
              className="text-orange-600 hover:text-orange-800 text-sm"
            >
              Clear Metrics
            </button>
            <button
              onClick={() => {
                const report = performanceMonitoringService.getPerformanceReport();
                const dataStr = JSON.stringify(report, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                URL.revokeObjectURL(url);
              }}
              className="text-green-600 hover:text-green-800 text-sm"
            >
              Export Report
            </button>
          </div>
        </div>
      )}

      {!performanceData && (
        <div className="text-center py-8">
          <div className="text-gray-500">No performance data available</div>
          <div className="text-sm text-gray-400 mt-1">
            Performance metrics will appear as you use the application
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;