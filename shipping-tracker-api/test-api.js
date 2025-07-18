// Simple test script to verify API endpoints
const http = require('http');

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: JSON.parse(body)
        });
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testAPI() {
  console.log('🧪 Testing API endpoints...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const health = await makeRequest('/health');
    console.log(`   Status: ${health.statusCode}`);
    console.log(`   Response: ${JSON.stringify(health.body, null, 2)}\n`);

    // Test tracking endpoint
    console.log('2. Testing tracking endpoint...');
    const tracking = await makeRequest('/api/tracking/TEST123');
    console.log(`   Status: ${tracking.statusCode}`);
    console.log(`   Response: ${JSON.stringify(tracking.body, null, 2)}\n`);

    // Test tracking search endpoint
    console.log('3. Testing tracking search endpoint...');
    const search = await makeRequest('/api/tracking/search', 'POST', {
      trackingNumber: 'CONTAINER123',
      type: 'container'
    });
    console.log(`   Status: ${search.statusCode}`);
    console.log(`   Response: ${JSON.stringify(search.body, null, 2)}\n`);

    console.log('✅ All API tests completed successfully!');
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

// Start the server and run tests
const { spawn } = require('child_process');

console.log('🚀 Starting server...');
const server = spawn('node', ['dist/index.js'], { cwd: __dirname });

// Wait for server to start
setTimeout(async () => {
  await testAPI();
  server.kill();
  process.exit(0);
}, 2000);