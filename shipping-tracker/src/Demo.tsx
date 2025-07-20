import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';

// Create a demo query client
const demoQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const Demo: React.FC = () => {
  const [demoStep, setDemoStep] = useState(0);
  
  const demoSteps = [
    {
      title: "Step 1: Initial State",
      description: "Application loads with empty state, showing search input and supported formats",
      action: "View the initial application state"
    },
    {
      title: "Step 2: Enter Tracking Number", 
      description: "User enters a valid container tracking number",
      action: "Type 'ABCD1234567' in the search field"
    },
    {
      title: "Step 3: Submit Search",
      description: "User clicks search button to initiate tracking lookup",
      action: "Click the Search button"
    },
    {
      title: "Step 4: Loading State",
      description: "Application shows loading indicators while fetching data",
      action: "Observe loading states and progress messages"
    },
    {
      title: "Step 5: Display Results",
      description: "Shipment details, timeline, and map are displayed",
      action: "Review all displayed information"
    },
    {
      title: "Step 6: Interactive Features",
      description: "User can interact with map markers and refresh data",
      action: "Test map interactions and refresh functionality"
    }
  ];

  const currentStep = demoSteps[demoStep];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Demo Controls */}
      <div className="bg-blue-600 text-white p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Shipping Tracker - End-to-End Demo</h1>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{currentStep.title}</h2>
              <p className="text-blue-100">{currentStep.description}</p>
              <p className="text-sm text-blue-200 mt-1">Action: {currentStep.action}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDemoStep(Math.max(0, demoStep - 1))}
                disabled={demoStep === 0}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-400 disabled:bg-blue-800 disabled:opacity-50 rounded"
              >
                Previous
              </button>
              <span className="px-4 py-2 bg-blue-700 rounded">
                {demoStep + 1} / {demoSteps.length}
              </span>
              <button
                onClick={() => setDemoStep(Math.min(demoSteps.length - 1, demoStep + 1))}
                disabled={demoStep === demoSteps.length - 1}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-400 disabled:bg-blue-800 disabled:opacity-50 rounded"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Application */}
      <QueryClientProvider client={demoQueryClient}>
        <App />
      </QueryClientProvider>

      {/* Demo Instructions */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-lg font-semibold mb-3">Demo Instructions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {demoSteps.map((step, index) => (
              <div
                key={index}
                className={`p-3 rounded border ${
                  index === demoStep 
                    ? 'border-blue-500 bg-blue-50' 
                    : index < demoStep 
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 bg-gray-50'
                }`}
              >
                <h4 className="font-medium text-sm">{step.title}</h4>
                <p className="text-xs text-gray-600 mt-1">{step.description}</p>
                <p className="text-xs text-blue-600 mt-1 font-medium">{step.action}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Test Data Information */}
      <div className="bg-gray-50 border-t border-gray-200 p-4">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-lg font-semibold mb-3">Test Data Available</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-3 rounded border">
              <h4 className="font-medium text-green-600">Valid Tracking Numbers</h4>
              <ul className="mt-2 space-y-1 text-gray-600">
                <li>• ABCD1234567 (Container)</li>
                <li>• ABC123456789 (Booking)</li>
                <li>• ABCD123456789012 (BOL)</li>
              </ul>
            </div>
            <div className="bg-white p-3 rounded border">
              <h4 className="font-medium text-red-600">Error Test Cases</h4>
              <ul className="mt-2 space-y-1 text-gray-600">
                <li>• Use "error" in tracking number</li>
                <li>• Use "timeout" for timeout test</li>
                <li>• Use invalid format</li>
              </ul>
            </div>
            <div className="bg-white p-3 rounded border">
              <h4 className="font-medium text-blue-600">Features to Test</h4>
              <ul className="mt-2 space-y-1 text-gray-600">
                <li>• Search validation</li>
                <li>• Loading states</li>
                <li>• Timeline display</li>
                <li>• Map interactions</li>
                <li>• Error handling</li>
                <li>• Responsive design</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Demo;