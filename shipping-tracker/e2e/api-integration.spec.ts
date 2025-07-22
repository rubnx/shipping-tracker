import { test, expect } from '@playwright/test';

test.describe('API Integration E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should handle API responses correctly', async ({ page }) => {
    // Monitor network requests
    const apiRequests: any[] = [];
    const apiResponses: any[] = [];
    
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiRequests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        });
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        apiResponses.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers()
        });
      }
    });
    
    // Perform search
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
    
    // Verify API calls were made
    expect(apiRequests.length).toBeGreaterThan(0);
    expect(apiResponses.length).toBeGreaterThan(0);
    
    // Check that tracking API was called
    const trackingRequest = apiRequests.find(req => req.url.includes('/track'));
    expect(trackingRequest).toBeTruthy();
    
    // Check response status
    const trackingResponse = apiResponses.find(res => res.url.includes('/track'));
    expect(trackingResponse?.status).toBe(200);
  });

  test('should handle API timeouts gracefully', async ({ page }) => {
    // Simulate slow API response
    await page.route('**/api/track**', async route => {
      await new Promise(resolve => setTimeout(resolve, 20000)); // 20 second delay
      await route.continue();
    });
    
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    
    // Should show timeout error within reasonable time
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 25000 });
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/timeout|slow/i);
  });

  test('should handle API errors with proper fallback', async ({ page }) => {
    // Simulate API error
    await page.route('**/api/track**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    
    // Should show retry option
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Test retry functionality
    await page.unroute('**/api/track**');
    await page.locator('[data-testid="retry-button"]').click();
    
    // Should eventually show results
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
  });

  test('should handle different API response formats', async ({ page }) => {
    // Test with different mock responses
    const mockResponses = [
      {
        trackingNumber: 'DEMO123456789',
        status: 'In Transit',
        timeline: [
          { date: '2024-01-01', event: 'Shipped', location: 'Shanghai' },
          { date: '2024-01-05', event: 'In Transit', location: 'Pacific Ocean' }
        ]
      },
      {
        trackingNumber: 'BOOK123456789',
        status: 'Delivered',
        timeline: [
          { date: '2024-01-01', event: 'Booked', location: 'Los Angeles' },
          { date: '2024-01-10', event: 'Delivered', location: 'New York' }
        ]
      }
    ];
    
    for (const mockResponse of mockResponses) {
      await page.route('**/api/track**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockResponse })
        });
      });
      
      await page.goto('/');
      await page.locator('[data-testid="search-input"]').fill(mockResponse.trackingNumber);
      await page.locator('[data-testid="search-button"]').click();
      
      // Verify response is handled correctly
      await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('[data-testid="tracking-number"]')).toContainText(mockResponse.trackingNumber);
      await expect(page.locator('[data-testid="shipment-status"]')).toContainText(mockResponse.status);
      
      await page.unroute('**/api/track**');
    }
  });

  test('should handle rate limiting appropriately', async ({ page }) => {
    // Simulate rate limiting
    let requestCount = 0;
    await page.route('**/api/track**', route => {
      requestCount++;
      if (requestCount > 3) {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Rate limit exceeded' })
        });
      } else {
        route.continue();
      }
    });
    
    // Make multiple requests quickly
    for (let i = 0; i < 5; i++) {
      await page.goto('/');
      await page.locator('[data-testid="search-input"]').fill(`DEMO12345678${i}`);
      await page.locator('[data-testid="search-button"]').click();
      
      if (i < 3) {
        // First few should succeed
        await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
      } else {
        // Later ones should show rate limit error
        await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="error-message"]')).toContainText(/rate limit|too many/i);
      }
    }
  });

  test('should validate API request format', async ({ page }) => {
    // Monitor request format
    let lastRequest: any = null;
    
    page.on('request', request => {
      if (request.url().includes('/api/track')) {
        lastRequest = {
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          postData: request.postData()
        };
      }
    });
    
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
    
    // Verify request format
    expect(lastRequest).toBeTruthy();
    expect(lastRequest.method).toBe('GET');
    expect(lastRequest.url).toContain('DEMO123456789');
    
    // Check headers
    expect(lastRequest.headers['content-type']).toContain('application/json');
  });

  test('should handle concurrent API requests', async ({ page }) => {
    // Open multiple tabs/contexts to simulate concurrent requests
    const context = page.context();
    const page2 = await context.newPage();
    const page3 = await context.newPage();
    
    // Navigate all pages
    await page.goto('/');
    await page2.goto('/');
    await page3.goto('/');
    
    // Start searches simultaneously
    const searches = [
      page.locator('[data-testid="search-input"]').fill('DEMO123456789'),
      page2.locator('[data-testid="search-input"]').fill('BOOK123456789'),
      page3.locator('[data-testid="search-input"]').fill('BOL123456789')
    ];
    
    await Promise.all(searches);
    
    // Click search buttons simultaneously
    const searchClicks = [
      page.locator('[data-testid="search-button"]').click(),
      page2.locator('[data-testid="search-button"]').click(),
      page3.locator('[data-testid="search-button"]').click()
    ];
    
    await Promise.all(searchClicks);
    
    // All should eventually show results
    await Promise.all([
      expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 20000 }),
      expect(page2.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 20000 }),
      expect(page3.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 20000 })
    ]);
    
    // Clean up
    await page2.close();
    await page3.close();
  });

  test('should handle API version compatibility', async ({ page }) => {
    // Test with different API versions
    await page.route('**/api/**', route => {
      const url = route.request().url();
      
      // Add version header to response
      route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'API-Version': '1.0.0'
        },
        body: JSON.stringify({
          data: {
            trackingNumber: 'DEMO123456789',
            status: 'In Transit',
            apiVersion: '1.0.0'
          }
        })
      });
    });
    
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    
    // Should handle versioned response correctly
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="tracking-number"]')).toContainText('DEMO123456789');
  });
});