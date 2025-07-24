import React from 'react';

function SimpleTestApp() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-6 border border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Shipping Tracker - Test Mode</h1>
          <p className="text-gray-600 mb-4">
            This is a simplified version to test if React is rendering correctly.
          </p>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-green-700">
              ✅ If you can see this content, React is working properly!
            </p>
          </div>
          <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-blue-700">
              Next step: Check browser console for any errors and gradually add back components.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SimpleTestApp;