import './App.css';

function App() {
  console.log('App component rendering...');
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Shipping Tracker
        </h1>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Application Status</h2>
          <p className="text-green-600">✅ React app is running successfully!</p>
          <p className="text-gray-600 mt-2">
            If you can see this message, the basic React setup is working.
          </p>
          <div className="mt-4 p-4 bg-blue-50 rounded">
            <p className="text-sm text-blue-800">
              <strong>Next steps:</strong> We'll gradually add components back to identify any issues.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;