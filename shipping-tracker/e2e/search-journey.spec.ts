import { test, expect } from '@playwright/test';

test.describe('Search Journey E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Shipping Tracker/);
  });

  test('should complete basic search journey with demo data', async ({ page }) => {
    // Test the complete user journey from search to results
    
    // 1. Verify initial page load
    await expect(page.locator('h1')).toContainText('Shipping Tracker');
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
    
    // 2. Enter a demo tracking number
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill('DEMO123456789');
    
    // 3. Submit search
    const searchButton = page.locator('[data-testid="search-button"]');
    await searchButton.click();
    
    // 4. Wait for loading state
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
    
    // 5. Wait for results to load
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
    
    // 6. Verify shipment details are displayed
    await expect(page.locator('[data-testid="tracking-number"]')).toContainText('DEMO123456789');
    await expect(page.locator('[data-testid="shipment-status"]')).toBeVisible();
    
    // 7. Verify timeline component is displayed
    await expect(page.locator('[data-testid="timeline-component"]')).toBeVisible();
    
    // 8. Verify map component is displayed
    await expect(page.locator('[data-testid="map-component"]')).toBeVisible();
    
    // 9. Take screenshot for visual verification
    await page.screenshot({ path: 'test-results/search-journey-complete.png', fullPage: true });
  });

  test('should handle invalid tracking number gracefully', async ({ page }) => {
    // Test error handling for invalid tracking numbers
    
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill('INVALID123');
    
    const searchButton = page.locator('[data-testid="search-button"]');
    await searchButton.click();
    
    // Should show validation error
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/invalid/i);
  });

  test('should show search history and suggestions', async ({ page }) => {
    // Test search history functionality
    
    const searchInput = page.locator('[data-testid="search-input"]');
    
    // Perform first search
    await searchInput.fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
    
    // Go back to search
    await page.goto('/');
    
    // Click on search input to show history
    await searchInput.click();
    
    // Should show search history dropdown
    await expect(page.locator('[data-testid="search-history"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-history-item"]')).toContainText('DEMO123456789');
  });

  test('should work with different tracking number formats', async ({ page }) => {
    const trackingNumbers = [
      'DEMO123456789',      // Demo container
      'BOOK123456789',      // Demo booking
      'BOL123456789',       // Demo BOL
    ];

    for (const trackingNumber of trackingNumbers) {
      await page.goto('/');
      
      const searchInput = page.locator('[data-testid="search-input"]');
      await searchInput.fill(trackingNumber);
      
      const searchButton = page.locator('[data-testid="search-button"]');
      await searchButton.click();
      
      // Should load results for each format
      await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('[data-testid="tracking-number"]')).toContainText(trackingNumber);
      
      // Take screenshot for each format
      await page.screenshot({ 
        path: `test-results/tracking-format-${trackingNumber}.png`, 
        fullPage: true 
      });
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network failure
    await page.route('**/api/**', route => route.abort());
    
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill('DEMO123456789');
    
    const searchButton = page.locator('[data-testid="search-button"]');
    await searchButton.click();
    
    // Should show network error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/network/i);
    
    // Should show retry button
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Test accessibility - keyboard navigation
    
    // Tab to search input
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="search-input"]')).toBeFocused();
    
    // Type tracking number
    await page.keyboard.type('DEMO123456789');
    
    // Tab to search button
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="search-button"]')).toBeFocused();
    
    // Press Enter to search
    await page.keyboard.press('Enter');
    
    // Should load results
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
  });
});