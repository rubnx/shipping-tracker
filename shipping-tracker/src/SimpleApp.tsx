import React from 'react';

function SimpleApp() {
  return (
    <div style={{ padding: '20px', border: '2px solid #blue', borderRadius: '8px', marginTop: '20px' }}>
      <h2 style={{ color: 'blue' }}>Simple App Component</h2>
      <p>This is a simplified version of the main App component.</p>
      <div style={{ backgroundColor: '#e6f3ff', padding: '15px', borderRadius: '5px', marginTop: '10px' }}>
        <p>✅ If you can see this, the App component structure is working!</p>
      </div>
    </div>
  );
}

export default SimpleApp;