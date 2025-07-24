import React, { useState, useEffect } from 'react';

interface ProgressiveMessageDisplayProps {
  isLoading: boolean;
  elapsedTime: number;
  currentProvider?: string;
  providerTier?: 'free' | 'freemium' | 'premium';
  variant?: 'compact' | 'detailed';
  className?: string;
}

interface ProgressiveMessage {
  id: string;
  message: string;
  timestamp: number;
  type: 'info' | 'warning' | 'tip' | 'status';
  icon?: string;
  priority: number;
}

/**
 * Progressive message display that shows contextual messages based on loading progress
 * Implements Requirements 5.1, 5.2 for progressive loading messages
 */
export function ProgressiveMessageDisplay({
  isLoading,
  elapsedTime,
  currentProvider,
  providerTier,
  variant = 'detailed',
  className = '',
}: ProgressiveMessageDisplayProps) {
  const [messages, setMessages] = useState<ProgressiveMessage[]>([]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  // Generate progressive messages based on elapsed time and context
  useEffect(() => {
    if (!isLoading) {
      setMessages([]);
      setCurrentMessageIndex(0);
      return;
    }

    const newMessages: ProgressiveMessage[] = [];
    const now = Date.now();

    // Initial messages (0-3 seconds)
    if (elapsedTime >= 0) {
      newMessages.push({
        id: 'initial',
        message: 'Starting search for tracking information...',
        timestamp: now,
        type: 'status',
        icon: '🔍',
        priority: 1,
      });
    }

    // Early progress messages (3-8 seconds)
    if (elapsedTime > 3000) {
      newMessages.push({
        id: 'checking-sources',
        message: 'Checking multiple data sources...',
        timestamp: now,
        type: 'info',
        icon: '📡',
        priority: 2,
      });
    }

    // Provider-specific messages
    if (currentProvider && elapsedTime > 2000) {
      const providerMessages = getProviderSpecificMessages(currentProvider, providerTier, elapsedTime);
      newMessages.push(...providerMessages.map(msg => ({ ...msg, timestamp: now })));
    }

    // Intermediate messages (8-15 seconds)
    if (elapsedTime > 8000) {
      newMessages.push({
        id: 'trying-alternatives',
        message: 'Trying alternative providers...',
        timestamp: now,
        type: 'info',
        icon: '🔄',
        priority: 4,
      });
    }

    // Warning messages (15-20 seconds)
    if (elapsedTime > 15000) {
      newMessages.push({
        id: 'slow-response',
        message: 'Some APIs are responding slowly...',
        timestamp: now,
        type: 'warning',
        icon: '⚠️',
        priority: 5,
      });
    }

    // Helpful tips (20+ seconds)
    if (elapsedTime > 20000) {
      newMessages.push({
        id: 'patience-tip',
        message: 'Almost there! Free tier APIs may take longer.',
        timestamp: now,
        type: 'tip',
        icon: '💡',
        priority: 6,
      });
    }

    // Extended wait messages (25+ seconds)
    if (elapsedTime > 25000) {
      newMessages.push({
        id: 'exploring-sources',
        message: 'Exploring additional data sources...',
        timestamp: now,
        type: 'info',
        icon: '🌐',
        priority: 7,
      });
    }

    // Sort by priority and update messages
    const sortedMessages = newMessages.sort((a, b) => b.priority - a.priority);
    setMessages(sortedMessages);
  }, [isLoading, elapsedTime, currentProvider, providerTier]);

  // Cycle through messages for compact variant
  useEffect(() => {
    if (variant !== 'compact' || messages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentMessageIndex(prev => (prev + 1) % messages.length);
    }, 3000); // Change message every 3 seconds

    return () => clearInterval(interval);
  }, [messages.length, variant]);

  /**
   * Get provider-specific messages
   */
  function getProviderSpecificMessages(
    provider: string, 
    tier?: 'free' | 'freemium' | 'premium', 
    elapsed?: number
  ): Omit<ProgressiveMessage, 'timestamp'>[] {
    const messages: Omit<ProgressiveMessage, 'timestamp'>[] = [];

    // Provider connection message
    messages.push({
      id: `provider-${provider.toLowerCase()}`,
      message: `Contacting ${provider}...`,
      type: 'status',
      icon: '📞',
      priority: 3,
    });

    // Tier-specific messages
    if (tier === 'free' && elapsed && elapsed > 5000) {
      messages.push({
        id: 'free-tier-delay',
        message: `${provider} (free tier) may take longer...`,
        type: 'info',
        icon: '⏳',
        priority: 4,
      });
    }

    if (tier === 'premium' && elapsed && elapsed > 3000) {
      messages.push({
        id: 'premium-processing',
        message: `${provider} is processing your request...`,
        type: 'info',
        icon: '⚡',
        priority: 4,
      });
    }

    // Provider-specific tips
    const providerTips = getProviderTips(provider);
    if (providerTips && elapsed && elapsed > 10000) {
      messages.push({
        id: `tip-${provider.toLowerCase()}`,
        message: providerTips,
        type: 'tip',
        icon: '💡',
        priority: 5,
      });
    }

    return messages;
  }

  /**
   * Get provider-specific tips
   */
  function getProviderTips(provider: string): string | null {
    const tips: Record<string, string> = {
      'Track-Trace': 'Track-Trace provides basic tracking for most carriers.',
      'ShipsGo': 'ShipsGo offers enhanced vessel tracking information.',
      'SeaRates': 'SeaRates includes shipping rates and route optimization.',
      'Project44': 'Project44 provides enterprise-grade logistics data.',
      'Marine Traffic': 'Marine Traffic specializes in real-time vessel positions.',
      'Vessel Finder': 'Vessel Finder offers comprehensive ship tracking.',
    };

    return tips[provider] || null;
  }

  /**
   * Get message type styling
   */
  function getMessageTypeStyles(type: ProgressiveMessage['type']) {
    switch (type) {
      case 'warning':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'tip':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'status':
        return 'text-green-700 bg-green-50 border-green-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  }

  /**
   * Format elapsed time for display
   */
  function formatElapsedTime(ms: number): string {
    if (ms < 1000) return 'now';
    if (ms < 60000) return `${Math.round(ms / 1000)}s ago`;
    return `${Math.floor(ms / 60000)}m ago`;
  }

  if (!isLoading || messages.length === 0) return null;

  // Compact variant - show one message at a time
  if (variant === 'compact') {
    const currentMessage = messages[currentMessageIndex];
    if (!currentMessage) return null;

    return (
      <div className={`${className}`}>
        <div className={`flex items-center space-x-2 p-3 rounded-md border ${getMessageTypeStyles(currentMessage.type)}`}>
          {currentMessage.icon && (
            <span className="text-lg" role="img" aria-label="status">
              {currentMessage.icon}
            </span>
          )}
          <div className="flex-1">
            <p className="text-sm font-medium">{currentMessage.message}</p>
            {messages.length > 1 && (
              <div className="flex items-center space-x-1 mt-1">
                {messages.map((_, index) => (
                  <div
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      index === currentMessageIndex ? 'bg-current' : 'bg-current opacity-30'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Detailed variant - show all messages
  return (
    <div className={`space-y-2 ${className}`}>
      {messages.slice(0, 3).map((message) => ( // Show only the 3 most recent/important messages
        <div
          key={message.id}
          className={`flex items-start space-x-2 p-3 rounded-md border ${getMessageTypeStyles(message.type)} transition-all duration-300 ease-in-out`}
        >
          {message.icon && (
            <span className="text-base mt-0.5" role="img" aria-label="status">
              {message.icon}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{message.message}</p>
            <p className="text-xs opacity-75 mt-1">
              {formatElapsedTime(Date.now() - message.timestamp)}
            </p>
          </div>
          
          {/* Message type indicator */}
          <div className="flex-shrink-0">
            {message.type === 'warning' && (
              <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            {message.type === 'tip' && (
              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            )}
            {message.type === 'status' && (
              <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
            )}
          </div>
        </div>
      ))}
      
      {/* Show message count if there are more */}
      {messages.length > 3 && (
        <div className="text-center">
          <button className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
            +{messages.length - 3} more messages
          </button>
        </div>
      )}
    </div>
  );
}

export default ProgressiveMessageDisplay;