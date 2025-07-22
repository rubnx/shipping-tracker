import { useState, useEffect } from 'react';
import { DemoModeUtils, demoConfig, type DemoTrackingNumber } from '../../config/demo';

interface DemoModeInfo {
  enabled: boolean;
  currentlyEnabled: boolean;
  description: string;
  availableTrackingNumbers: {
    containers: string[];
    bookings: string[];
    billsOfLading: string[];
    carriers: string[];
    errorTesting: string[];
    statusTesting: string[];
  };
  features: string[];
  usage: {
    examples: Array<{
      number: string;
      description: string;
    }>;
  };
}

interface DemoModeToggleProps {
  onDemoNumberSelect?: (trackingNumber: string) => void;
}

export function DemoModeToggle({ onDemoNumberSelect }: DemoModeToggleProps) {
  const [demoInfo, setDemoInfo] = useState<DemoModeInfo | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [useLocalDemo, setUseLocalDemo] = useState(false);

  useEffect(() => {
    // Check if we should use local demo config or fetch from API
    if (DemoModeUtils.isEnabled()) {
      if (useLocalDemo) {
        loadLocalDemoInfo();
      } else {
        fetchDemoInfo();
      }
    }
  }, [useLocalDemo]);

  const loadLocalDemoInfo = () => {
    const quickExamples = DemoModeUtils.getQuickExamples();
    const containerNumbers = DemoModeUtils.getDemoNumbersByCategory('container');
    const bookingNumbers = DemoModeUtils.getDemoNumbersByCategory('booking');
    const bolNumbers = DemoModeUtils.getDemoNumbersByCategory('bol');
    const carrierNumbers = DemoModeUtils.getDemoNumbersByCategory('carrier');
    const errorNumbers = DemoModeUtils.getDemoNumbersByCategory('error');
    const statusNumbers = DemoModeUtils.getDemoNumbersByCategory('status');

    setDemoInfo({
      enabled: true,
      currentlyEnabled: DemoModeUtils.isEnabled(),
      description: DemoModeUtils.getStatusMessage(),
      availableTrackingNumbers: {
        containers: containerNumbers.map(d => d.number),
        bookings: bookingNumbers.map(d => d.number),
        billsOfLading: bolNumbers.map(d => d.number),
        carriers: carrierNumbers.map(d => d.number),
        errorTesting: errorNumbers.map(d => d.number),
        statusTesting: statusNumbers.map(d => d.number),
      },
      features: DemoModeUtils.getFeatures(),
      usage: {
        examples: quickExamples.map(demo => ({
          number: demo.number,
          description: demo.description,
        })),
      },
    });
  };

  const fetchDemoInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tracking/demo/info`);
      const result = await response.json();
      
      if (result.success) {
        setDemoInfo(result.data);
      } else {
        // Fallback to local demo info if API fails
        setUseLocalDemo(true);
      }
    } catch (error) {
      console.error('Failed to fetch demo info, using local config:', error);
      setUseLocalDemo(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoNumberClick = (trackingNumber: string) => {
    if (onDemoNumberSelect) {
      onDemoNumberSelect(trackingNumber);
    }
  };

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-blue-200 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-blue-100 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!demoInfo) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
          <h3 className="text-sm font-medium text-blue-900">
            Demo Mode {demoInfo.currentlyEnabled ? 'Enabled' : 'Available'}
          </h3>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          {isExpanded ? 'Hide' : 'Show'} Demo Numbers
        </button>
      </div>
      
      <p className="text-blue-700 text-sm mt-1">
        {demoInfo.description}
      </p>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Quick Examples */}
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-2">Quick Examples:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {demoInfo.usage.examples.map((example, index) => (
                <button
                  key={index}
                  onClick={() => handleDemoNumberClick(example.number)}
                  className="text-left p-2 bg-white border border-blue-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <div className="font-mono text-sm text-blue-800">{example.number}</div>
                  <div className="text-xs text-blue-600">{example.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(demoInfo.availableTrackingNumbers).map(([category, numbers]) => {
              if (numbers.length === 0) return null;
              
              return (
                <div key={category} className="bg-white rounded border border-blue-200 p-3">
                  <h5 className="text-sm font-medium text-blue-900 mb-2 capitalize">
                    {category.replace(/([A-Z])/g, ' $1').trim()}
                  </h5>
                  <div className="space-y-1">
                    {numbers.slice(0, 5).map((number, index) => (
                      <button
                        key={index}
                        onClick={() => handleDemoNumberClick(number)}
                        className="block w-full text-left font-mono text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-50 px-2 py-1 rounded"
                      >
                        {number}
                      </button>
                    ))}
                    {numbers.length > 5 && (
                      <div className="text-xs text-blue-500 px-2">
                        +{numbers.length - 5} more...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Features */}
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-2">Demo Features:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              {demoInfo.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}