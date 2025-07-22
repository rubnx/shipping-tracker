import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for E2E tests...');
  
  // Wait for services to be ready
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for frontend to be ready
    console.log('⏳ Waiting for frontend service...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    console.log('✅ Frontend service is ready');
    
    // Wait for backend to be ready
    console.log('⏳ Waiting for backend service...');
    await page.goto('http://localhost:3001/health');
    const healthResponse = await page.textContent('body');
    if (healthResponse && healthResponse.includes('OK')) {
      console.log('✅ Backend service is ready');
    } else {
      throw new Error('Backend health check failed');
    }
    
    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;