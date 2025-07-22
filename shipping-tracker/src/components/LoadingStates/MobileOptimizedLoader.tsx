import React, { useState, useEffect } from 'react';
import { APIProvider } from '../../hooks/useEnhancedLoading';

interface MobileOptimizedLoaderProps {
  isLoading: boolean;
  trackingNumber?: string;
  currentStep?: string;
  providers?: APIProvider[];
  elapsedTime?: number;
  progress?: number;
  error?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  onSwitchToDemo?: () => void;
  className?: string;
  compact?: boolean;
}

/**
 * Mobile-optimized loading component with touch-friendly interface
 * and minimal screen space usage
 * Implements Requirements 5.1, 5.2, 4.1, 4.2 for mobile loading states
 */
export function MobileOptimizedLoader({
  isLoading,
  trackingNumber,
  currentStep = 'Loading...',
  providers = [],
  elapsedTime = 0,
  progress = 0,
  error,
  onCancel,
  onRetry,
  onSwitchToDemo,
  className = '',
  compact = false,
}: MobileOptimizedLoaderProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  // Rotate through loading messages
  const loadingMessages = [
    '🔍 Searching for your shipment...',
    '📡 Checking multiple carriers...',
    '🌐 Fetching latest updates...',
    '⚡ Almost there...',
  ];

  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setCurrentMessageIndex(prev => (prev + 1) % loadingMessages.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [isLoading, loadingMessages.length]);

  const formatTime = (ms: number): string => {
    if (ms < 1000) return '0s';
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  };

  const getActiveProvider = () => {
    return providers.find(p => p.status === 'active');
  };

  const getProviderStats = () => {
    const completed = providers.filter(p => p.status === 'completed').length;
    const failed = providers.filter(p => p.status === 'failed').length;
    const total = providers.length;
    return { completed, failed, total };
  };

  if (!isLoading && !error) return null;

  // Compact version for minimal space usage
  if (compact) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>\n        <div className=\"p-3\">\n          <div className=\"flex items-center space-x-3\">\n            {isLoading && (\n              <div className=\"w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0\" />\n            )}\n            \n            {error && (\n              <div className=\"w-5 h-5 bg-red-500 rounded-full flex-shrink-0 flex items-center justify-center\">\n                <svg className=\"w-3 h-3 text-white\" fill=\"currentColor\" viewBox=\"0 0 20 20\">\n                  <path fillRule=\"evenodd\" d=\"M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z\" clipRule=\"evenodd\" />\n                </svg>\n              </div>\n            )}\n            \n            <div className=\"flex-1 min-w-0\">\n              <p className=\"text-sm font-medium text-gray-900 truncate\">\n                {error ? 'Error occurred' : loadingMessages[currentMessageIndex]}\n              </p>\n              {trackingNumber && (\n                <p className=\"text-xs text-gray-500 truncate\">\n                  {trackingNumber}\n                </p>\n              )}\n            </div>\n            \n            {isLoading && elapsedTime > 0 && (\n              <span className=\"text-xs text-gray-500 flex-shrink-0\">\n                {formatTime(elapsedTime)}\n              </span>\n            )}\n          </div>\n          \n          {/* Progress bar */}\n          {isLoading && progress > 0 && (\n            <div className=\"mt-2\">\n              <div className=\"w-full bg-gray-200 rounded-full h-1\">\n                <div \n                  className=\"bg-blue-500 h-1 rounded-full transition-all duration-500 ease-out\"\n                  style={{ width: `${Math.min(progress, 95)}%` }}\n                />\n              </div>\n            </div>\n          )}\n          \n          {/* Error actions */}\n          {error && (onRetry || onSwitchToDemo) && (\n            <div className=\"flex space-x-2 mt-2\">\n              {onRetry && (\n                <button\n                  onClick={onRetry}\n                  className=\"flex-1 text-xs bg-blue-500 text-white px-3 py-1.5 rounded-md hover:bg-blue-600 transition-colors\"\n                >\n                  Retry\n                </button>\n              )}\n              {onSwitchToDemo && (\n                <button\n                  onClick={onSwitchToDemo}\n                  className=\"flex-1 text-xs bg-gray-500 text-white px-3 py-1.5 rounded-md hover:bg-gray-600 transition-colors\"\n                >\n                  Demo\n                </button>\n              )}\n            </div>\n          )}\n        </div>\n      </div>\n    );\n  }\n\n  // Full mobile loader\n  return (\n    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>\n      {/* Header */}\n      <div className=\"p-4 border-b border-gray-100\">\n        <div className=\"flex items-center justify-between\">\n          <div className=\"flex items-center space-x-3\">\n            {isLoading && (\n              <div className=\"w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin\" />\n            )}\n            \n            {error && (\n              <div className=\"w-6 h-6 bg-red-500 rounded-full flex items-center justify-center\">\n                <svg className=\"w-4 h-4 text-white\" fill=\"currentColor\" viewBox=\"0 0 20 20\">\n                  <path fillRule=\"evenodd\" d=\"M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z\" clipRule=\"evenodd\" />\n                </svg>\n              </div>\n            )}\n            \n            <div>\n              <h3 className=\"text-base font-semibold text-gray-900\">\n                {error ? 'Search Failed' : 'Searching...'}\n              </h3>\n              {trackingNumber && (\n                <p className=\"text-sm text-gray-600 font-mono\">\n                  {trackingNumber}\n                </p>\n              )}\n            </div>\n          </div>\n          \n          <div className=\"text-right\">\n            {isLoading && elapsedTime > 0 && (\n              <div className=\"text-sm text-gray-500\">\n                {formatTime(elapsedTime)}\n              </div>\n            )}\n            {onCancel && isLoading && (\n              <button\n                onClick={onCancel}\n                className=\"text-xs text-gray-400 hover:text-gray-600 mt-1 transition-colors\"\n              >\n                Cancel\n              </button>\n            )}\n          </div>\n        </div>\n        \n        {/* Progress bar */}\n        {isLoading && (\n          <div className=\"mt-3\">\n            <div className=\"flex items-center justify-between text-sm text-gray-600 mb-1\">\n              <span>Progress</span>\n              <span>{Math.round(progress)}%</span>\n            </div>\n            <div className=\"w-full bg-gray-200 rounded-full h-2\">\n              <div \n                className=\"bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out\"\n                style={{ width: `${Math.min(progress, 95)}%` }}\n              />\n            </div>\n          </div>\n        )}\n      </div>\n      \n      {/* Current status */}\n      <div className=\"p-4\">\n        {isLoading && (\n          <div className=\"text-center\">\n            <p className=\"text-base text-gray-700 mb-2\">\n              {loadingMessages[currentMessageIndex]}\n            </p>\n            \n            {getActiveProvider() && (\n              <p className=\"text-sm text-gray-500\">\n                Checking {getActiveProvider()?.name}...\n              </p>\n            )}\n            \n            {providers.length > 0 && (\n              <div className=\"mt-3\">\n                <button\n                  onClick={() => setShowDetails(!showDetails)}\n                  className=\"text-sm text-blue-600 hover:text-blue-800 transition-colors\"\n                >\n                  {showDetails ? 'Hide' : 'Show'} Details ({getProviderStats().completed}/{getProviderStats().total})\n                </button>\n              </div>\n            )}\n          </div>\n        )}\n        \n        {error && (\n          <div className=\"text-center\">\n            <div className=\"bg-red-50 border border-red-200 rounded-md p-3 mb-4\">\n              <p className=\"text-sm text-red-800\">{error}</p>\n            </div>\n            \n            <div className=\"space-y-2\">\n              {onRetry && (\n                <button\n                  onClick={onRetry}\n                  className=\"w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors font-medium\"\n                >\n                  Try Again\n                </button>\n              )}\n              \n              {onSwitchToDemo && (\n                <button\n                  onClick={onSwitchToDemo}\n                  className=\"w-full bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors\"\n                >\n                  Switch to Demo Mode\n                </button>\n              )}\n            </div>\n          </div>\n        )}\n      </div>\n      \n      {/* Provider details (collapsible) */}\n      {showDetails && providers.length > 0 && (\n        <div className=\"border-t border-gray-100 p-4\">\n          <h4 className=\"text-sm font-medium text-gray-700 mb-3\">\n            API Providers\n          </h4>\n          \n          <div className=\"space-y-2\">\n            {providers.map((provider) => (\n              <div key={provider.name} className=\"flex items-center justify-between p-2 bg-gray-50 rounded-md\">\n                <div className=\"flex items-center space-x-2\">\n                  {provider.status === 'completed' && (\n                    <div className=\"w-4 h-4 bg-green-500 rounded-full flex items-center justify-center\">\n                      <svg className=\"w-2.5 h-2.5 text-white\" fill=\"currentColor\" viewBox=\"0 0 20 20\">\n                        <path fillRule=\"evenodd\" d=\"M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z\" clipRule=\"evenodd\" />\n                      </svg>\n                    </div>\n                  )}\n                  \n                  {provider.status === 'active' && (\n                    <div className=\"w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin\" />\n                  )}\n                  \n                  {provider.status === 'failed' && (\n                    <div className=\"w-4 h-4 bg-red-500 rounded-full flex items-center justify-center\">\n                      <svg className=\"w-2.5 h-2.5 text-white\" fill=\"currentColor\" viewBox=\"0 0 20 20\">\n                        <path fillRule=\"evenodd\" d=\"M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z\" clipRule=\"evenodd\" />\n                      </svg>\n                    </div>\n                  )}\n                  \n                  {provider.status === 'pending' && (\n                    <div className=\"w-4 h-4 border-2 border-gray-300 rounded-full\" />\n                  )}\n                  \n                  <div>\n                    <span className=\"text-sm font-medium text-gray-900\">\n                      {provider.name}\n                    </span>\n                    <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${\n                      provider.tier === 'premium' ? 'bg-purple-100 text-purple-800' :\n                      provider.tier === 'freemium' ? 'bg-blue-100 text-blue-800' :\n                      'bg-green-100 text-green-800'\n                    }`}>\n                      {provider.tier}\n                    </span>\n                  </div>\n                </div>\n                \n                {provider.responseTime && (\n                  <span className=\"text-xs text-gray-500\">\n                    {formatTime(provider.responseTime)}\n                  </span>\n                )}\n              </div>\n            ))}\n          </div>\n        </div>\n      )}\n      \n      {/* Tips for mobile users */}\n      {isLoading && elapsedTime > 10000 && (\n        <div className=\"border-t border-gray-100 p-4 bg-blue-50\">\n          <div className=\"text-xs text-blue-700\">\n            <p className=\"font-medium mb-1\">💡 Tip for mobile users:</p>\n            <p>Keep your screen on to see real-time updates. Free APIs may take longer to respond.</p>\n          </div>\n        </div>\n      )}\n    </div>\n  );\n}\n\nexport default MobileOptimizedLoader;"