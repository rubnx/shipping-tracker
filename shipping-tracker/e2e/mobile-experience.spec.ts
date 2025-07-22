import { test, expect } from '@playwright/test';

test.describe('Mobile Experience E2E Tests', () => {
  test.use({ 
    viewport: { width: 375, height: 667 } // iPhone SE size
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display mobile-optimized layout', async ({ page }) => {
    // Verify mobile layout elements
    await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
    
    // Check that desktop-only elements are hidden
    const desktopSidebar = page.locator('[data-testid="desktop-sidebar"]');
    if (await desktopSidebar.count() > 0) {
      await expect(desktopSidebar).toBeHidden();
    }
    
    // Take mobile screenshot
    await page.screenshot({ path: 'test-results/mobile-layout.png', fullPage: true });
  });

  test('should handle touch interactions on mobile', async ({ page }) => {
    // Perform search to get results
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
    
    // Test touch interactions on map
    const mapComponent = page.locator('[data-testid="map-component"]');
    if (await mapComponent.count() > 0) {
      // Simulate pinch zoom
      await mapComponent.touchscreen.tap(200, 200);
      
      // Simulate pan gesture
      await page.touchscreen.tap(150, 150);
      await page.touchscreen.tap(250, 250);
    }
    
    // Test swipe on timeline if present
    const timelineComponent = page.locator('[data-testid="timeline-component"]');
    if (await timelineComponent.count() > 0) {
      const box = await timelineComponent.boundingBox();
      if (box) {
        // Simulate horizontal swipe
        await page.touchscreen.tap(box.x + 50, box.y + box.height / 2);
        await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2);
      }
    }
  });

  test('should optimize mobile performance', async ({ page }) => {
    // Monitor performance metrics
    const performanceEntries: any[] = [];
    
    page.on('response', response => {
      performanceEntries.push({
        url: response.url(),
        status: response.status(),
        timing: response.timing()
      });
    });
    
    // Perform search
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
    
    // Check that critical resources loaded quickly
    const criticalResources = performanceEntries.filter(entry => 
      entry.url.includes('/api/') || entry.url.includes('.js') || entry.url.includes('.css')
    );
    
    // Most resources should load within reasonable time
    const slowResources = criticalResources.filter(entry => 
      entry.timing && entry.timing.responseEnd > 3000
    );
    
    expect(slowResources.length).toBeLessThan(criticalResources.length * 0.2); // Less than 20% slow
  });

  test('should handle mobile-specific gestures', async ({ page }) => {
    // Test pull-to-refresh gesture (if implemented)
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
    
    // Simulate pull-to-refresh
    await page.touchscreen.tap(200, 50);
    await page.mouse.move(200, 200, { steps: 10 });
    
    // Should show refresh indicator or reload data
    // This depends on implementation - adjust based on actual behavior
  });

  test('should maintain usability on small screens', async ({ page }) => {
    // Test with very small viewport
    await page.setViewportSize({ width: 320, height: 568 }); // iPhone 5 size
    
    // All critical elements should still be accessible
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-button"]')).toBeVisible();
    
    // Perform search
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
    
    // Results should be readable and accessible
    const shipmentDetails = page.locator('[data-testid="shipment-details"]');
    const box = await shipmentDetails.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(320);
    
    // Take screenshot of small screen layout
    await page.screenshot({ path: 'test-results/small-screen-layout.png', fullPage: true });
  });

  test('should handle orientation changes', async ({ page }) => {
    // Start in portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
    
    // Take portrait screenshot
    await page.screenshot({ path: 'test-results/mobile-portrait.png', fullPage: true });
    
    // Switch to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    
    // Content should still be accessible
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible();
    
    // Take landscape screenshot
    await page.screenshot({ path: 'test-results/mobile-landscape.png', fullPage: true });
  });
});