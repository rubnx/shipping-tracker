import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should match homepage visual baseline', async ({ page }) => {
    // Wait for page to fully load
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('homepage-baseline.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should match search results visual baseline', async ({ page }) => {
    // Perform search
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
    
    // Wait for all components to load
    await page.waitForTimeout(2000);
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('search-results-baseline.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should match individual component visuals', async ({ page }) => {
    // Perform search to get components
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
    
    // Screenshot individual components
    const components = [
      { selector: '[data-testid="search-component"]', name: 'search-component' },
      { selector: '[data-testid="shipment-details"]', name: 'shipment-details' },
      { selector: '[data-testid="timeline-component"]', name: 'timeline-component' },
      { selector: '[data-testid="map-component"]', name: 'map-component' }
    ];
    
    for (const component of components) {
      const element = page.locator(component.selector);
      if (await element.count() > 0 && await element.isVisible()) {
        await expect(element).toHaveScreenshot(`${component.name}-baseline.png`, {
          animations: 'disabled'
        });
      }
    }
  });

  test('should match loading states visuals', async ({ page }) => {
    // Intercept API to delay response
    await page.route('**/api/track**', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });
    
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    
    // Capture loading state
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
    await expect(page).toHaveScreenshot('loading-state-baseline.png', {
      animations: 'disabled'
    });
  });

  test('should match error states visuals', async ({ page }) => {
    // Simulate API error
    await page.route('**/api/track**', route => {
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Tracking number not found' })
      });
    });
    
    await page.locator('[data-testid="search-input"]').fill('INVALID123');
    await page.locator('[data-testid="search-button"]').click();
    
    // Capture error state
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page).toHaveScreenshot('error-state-baseline.png', {
      animations: 'disabled'
    });
  });

  test('should match mobile visuals', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Homepage mobile
    await expect(page).toHaveScreenshot('mobile-homepage-baseline.png', {
      fullPage: true,
      animations: 'disabled'
    });
    
    // Search results mobile
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
    
    await expect(page).toHaveScreenshot('mobile-search-results-baseline.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should match tablet visuals', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Homepage tablet
    await expect(page).toHaveScreenshot('tablet-homepage-baseline.png', {
      fullPage: true,
      animations: 'disabled'
    });
    
    // Search results tablet
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
    
    await expect(page).toHaveScreenshot('tablet-search-results-baseline.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should match dark mode visuals if supported', async ({ page }) => {
    // Enable dark mode if supported
    await page.emulateMedia({ colorScheme: 'dark' });
    
    // Homepage dark mode
    await expect(page).toHaveScreenshot('dark-homepage-baseline.png', {
      fullPage: true,
      animations: 'disabled'
    });
    
    // Search results dark mode
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
    
    await expect(page).toHaveScreenshot('dark-search-results-baseline.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should match high contrast visuals', async ({ page }) => {
    // Simulate high contrast mode
    await page.addStyleTag({
      content: `
        @media (prefers-contrast: high) {
          :root {
            --bg-color: #000000;
            --text-color: #ffffff;
            --border-color: #ffffff;
          }
          * {
            background-color: var(--bg-color) !important;
            color: var(--text-color) !important;
            border-color: var(--border-color) !important;
          }
          button {
            background-color: var(--text-color) !important;
            color: var(--bg-color) !important;
          }
        }
      `
    });
    
    await page.emulateMedia({ forcedColors: 'active' });
    
    // High contrast homepage
    await expect(page).toHaveScreenshot('high-contrast-homepage-baseline.png', {
      fullPage: true,
      animations: 'disabled'
    });
    
    // High contrast search results
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
    
    await expect(page).toHaveScreenshot('high-contrast-search-results-baseline.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should match different tracking number format visuals', async ({ page }) => {
    const trackingFormats = [
      { number: 'DEMO123456789', name: 'container' },
      { number: 'BOOK123456789', name: 'booking' },
      { number: 'BOL123456789', name: 'bol' }
    ];
    
    for (const format of trackingFormats) {
      await page.goto('/');
      await page.locator('[data-testid="search-input"]').fill(format.number);
      await page.locator('[data-testid="search-button"]').click();
      await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
      
      await expect(page).toHaveScreenshot(`${format.name}-format-baseline.png`, {
        fullPage: true,
        animations: 'disabled'
      });
    }
  });

  test('should detect visual regressions in interactive states', async ({ page }) => {
    // Test hover states
    const searchButton = page.locator('[data-testid="search-button"]');
    await searchButton.hover();
    await expect(searchButton).toHaveScreenshot('search-button-hover.png');
    
    // Test focus states
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.focus();
    await expect(searchInput).toHaveScreenshot('search-input-focus.png');
    
    // Test active states
    await searchInput.fill('DEMO123456789');
    await expect(searchInput).toHaveScreenshot('search-input-filled.png');
  });
});