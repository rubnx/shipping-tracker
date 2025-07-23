import { useState, useEffect } from 'react';
import type { APIProvider } from '../../hooks/useEnhancedLoading';

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
            <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
                <div className="p-3">
                    <div className="flex items-center space-x-3">
                        {isLoading && (
                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                        )}

                        {error && (
                            <div className="w-5 h-5 bg-red-500 rounded-full flex-shrink-0 flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </div>
                        )}

                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                                {error ? 'Error occurred' : loadingMessages[currentMessageIndex]}
                            </p>
                            {trackingNumber && (
                                <p className="text-xs text-gray-500 truncate">
                                    {trackingNumber}
                                </p>
                            )}
                        </div>

                        {isLoading && elapsedTime > 0 && (
                            <span className="text-xs text-gray-500 flex-shrink-0">
                                {formatTime(elapsedTime)}
                            </span>
                        )}
                    </div>

                    {/* Progress bar */}
                    {isLoading && progress > 0 && (
                        <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-1">
                                <div
                                    className="bg-blue-500 h-1 rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${Math.min(progress, 95)}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Error actions */}
                    {error && (onRetry || onSwitchToDemo) && (
                        <div className="flex space-x-2 mt-2">
                            {onRetry && (
                                <button
                                    onClick={onRetry}
                                    className="flex-1 text-xs bg-blue-500 text-white px-3 py-1.5 rounded-md hover:bg-blue-600 transition-colors"
                                >
                                    Retry
                                </button>
                            )}
                            {onSwitchToDemo && (
                                <button
                                    onClick={onSwitchToDemo}
                                    className="flex-1 text-xs bg-gray-500 text-white px-3 py-1.5 rounded-md hover:bg-gray-600 transition-colors"
                                >
                                    Demo
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Full mobile loader
    return (
        <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        {isLoading && (
                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        )}

                        {error && (
                            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </div>
                        )}

                        <div>
                            <h3 className="text-base font-semibold text-gray-900">
                                {error ? 'Search Failed' : 'Searching...'}
                            </h3>
                            {trackingNumber && (
                                <p className="text-sm text-gray-600 font-mono">
                                    {trackingNumber}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="text-right">
                        {isLoading && elapsedTime > 0 && (
                            <div className="text-sm text-gray-500">
                                {formatTime(elapsedTime)}
                            </div>
                        )}
                        {onCancel && isLoading && (
                            <button
                                onClick={onCancel}
                                className="text-xs text-gray-400 hover:text-gray-600 mt-1 transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </div>

                {/* Progress bar */}
                {isLoading && (
                    <div className="mt-3">
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                            <span>Progress</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${Math.min(progress, 95)}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Current status */}
            <div className="p-4">
                {isLoading && (
                    <div className="text-center">
                        <p className="text-base text-gray-700 mb-2">
                            {loadingMessages[currentMessageIndex]}
                        </p>

                        {getActiveProvider() && (
                            <p className="text-sm text-gray-500">
                                Checking {getActiveProvider()?.name}...
                            </p>
                        )}

                        {providers.length > 0 && (
                            <div className="mt-3">
                                <button
                                    onClick={() => setShowDetails(!showDetails)}
                                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                                >
                                    {showDetails ? 'Hide' : 'Show'} Details ({getProviderStats().completed}/{getProviderStats().total})
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {error && (
                    <div className="text-center">
                        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>

                        <div className="space-y-2">
                            {onRetry && (
                                <button
                                    onClick={onRetry}
                                    className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors font-medium"
                                >
                                    Try Again
                                </button>
                            )}

                            {onSwitchToDemo && (
                                <button
                                    onClick={onSwitchToDemo}
                                    className="w-full bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
                                >
                                    Switch to Demo Mode
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Provider details (collapsible) */}
            {showDetails && providers.length > 0 && (
                <div className="border-t border-gray-100 p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                        API Providers
                    </h4>

                    <div className="space-y-2">
                        {providers.map((provider) => (
                            <div key={provider.name} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                                <div className="flex items-center space-x-2">
                                    {provider.status === 'completed' && (
                                        <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}

                                    {provider.status === 'active' && (
                                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    )}

                                    {provider.status === 'failed' && (
                                        <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}

                                    {provider.status === 'pending' && (
                                        <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                                    )}

                                    <div>
                                        <span className="text-sm font-medium text-gray-900">
                                            {provider.name}
                                        </span>
                                        <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${provider.tier === 'premium' ? 'bg-purple-100 text-purple-800' :
                                                provider.tier === 'freemium' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-green-100 text-green-800'
                                            }`}>
                                            {provider.tier}
                                        </span>
                                    </div>
                                </div>

                                {provider.responseTime && (
                                    <span className="text-xs text-gray-500">
                                        {formatTime(provider.responseTime)}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tips for mobile users */}
            {isLoading && elapsedTime > 10000 && (
                <div className="border-t border-gray-100 p-4 bg-blue-50">
                    <div className="text-xs text-blue-700">
                        <p className="font-medium mb-1">💡 Tip for mobile users:</p>
                        <p>Keep your screen on to see real-time updates. Free APIs may take longer to respond.</p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MobileOptimizedLoader;