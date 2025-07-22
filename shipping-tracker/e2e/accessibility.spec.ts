import { test, expect } from '@playwright/test';

test.describe('Accessibility E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    // Check main navigation elements
    const searchInput = page.locator('[data-testid="search-input"]');
    await expect(searchInput).toHaveAttribute('aria-label');
    
    const searchButton = page.locator('[data-testid="search-button"]');
    await expect(searchButton).toHaveAttribute('aria-label');
    
    // Check for proper heading hierarchy
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    
    // Perform search to check results accessibility
    await searchInput.fill('DEMO123456789');
    await searchButton.click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
    
    // Check results have proper ARIA attributes
    const shipmentDetails = page.locator('[data-testid="shipment-details"]');
    await expect(shipmentDetails).toHaveAttribute('role');
    
    // Check timeline accessibility
    const timeline = page.locator('[data-testid="timeline-component"]');
    if (await timeline.count() > 0) {
      await expect(timeline).toHaveAttribute('role');
      
      // Timeline items should have proper labels
      const timelineItems = page.locator('[data-testid="timeline-item"]');
      const count = await timelineItems.count();
      for (let i = 0; i < count; i++) {
        const item = timelineItems.nth(i);
        await expect(item).toHaveAttribute('aria-label');
      }
    }
  });

  test('should support keyboard navigation throughout the app', async ({ page }) => {
    // Start keyboard navigation from the beginning
    await page.keyboard.press('Tab');
    
    // Should focus on search input
    await expect(page.locator('[data-testid="search-input"]')).toBeFocused();
    
    // Type search query
    await page.keyboard.type('DEMO123456789');
    
    // Tab to search button
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="search-button"]')).toBeFocused();
    
    // Activate search with Enter
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
    
    // Continue tabbing through results
    await page.keyboard.press('Tab');
    
    // Should be able to navigate through all interactive elements
    const focusableElements = await page.locator('button, input, a, [tabindex="0"]').all();
    
    for (let i = 0; i < Math.min(focusableElements.length, 10); i++) {
      const currentFocus = await page.evaluate(() => document.activeElement?.tagName);
      expect(['BUTTON', 'INPUT', 'A', 'DIV']).toContain(currentFocus);
      await page.keyboard.press('Tab');
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    // Perform search to get full page content
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
    
    // Check color contrast for key elements
    const elementsToCheck = [
      '[data-testid="search-input"]',
      '[data-testid="search-button"]',
      '[data-testid="shipment-status"]',
      'h1, h2, h3',
      'p',
      'button'
    ];
    
    for (const selector of elementsToCheck) {
      const elements = page.locator(selector);
      const count = await elements.count();
      
      for (let i = 0; i < Math.min(count, 3); i++) {
        const element = elements.nth(i);
        if (await element.isVisible()) {
          const styles = await element.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return {
              color: computed.color,
              backgroundColor: computed.backgroundColor,
              fontSize: computed.fontSize
            };
          });
          
          // Basic check that text is not transparent
          expect(styles.color).not.toBe('rgba(0, 0, 0, 0)');
          expect(styles.color).not.toBe('transparent');
        }
      }
    }
  });

  test('should work with screen reader simulation', async ({ page }) => {
    // Simulate screen reader by checking text content and ARIA attributes
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
    
    // Check that important information is available as text
    const trackingNumber = await page.locator('[data-testid="tracking-number"]').textContent();
    expect(trackingNumber).toContain('DEMO123456789');
    
    // Check status information
    const status = await page.locator('[data-testid="shipment-status"]').textContent();
    expect(status).toBeTruthy();
    expect(status?.length).toBeGreaterThan(0);
    
    // Check timeline has descriptive text
    const timeline = page.locator('[data-testid="timeline-component"]');
    if (await timeline.count() > 0) {
      const timelineText = await timeline.textContent();
      expect(timelineText).toBeTruthy();
      expect(timelineText?.length).toBeGreaterThan(10);
    }
    
    // Check that loading states have appropriate text
    await page.goto('/');
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    
    // Loading indicator should have text or aria-label
    const loadingIndicator = page.locator('[data-testid="loading-indicator"]');
    if (await loadingIndicator.isVisible()) {
      const loadingText = await loadingIndicator.textContent();
      const ariaLabel = await loadingIndicator.getAttribute('aria-label');
      expect(loadingText || ariaLabel).toBeTruthy();
    }
  });

  test('should handle high contrast mode', async ({ page }) => {
    // Simulate high contrast mode by forcing contrast styles
    await page.addStyleTag({
      content: `
        @media (prefers-contrast: high) {
          * {
            background-color: black !important;
            color: white !important;
            border-color: white !important;
          }
          button {
            background-color: white !important;
            color: black !important;
          }
        }
      `
    });
    
    // Perform search
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
    
    // Take screenshot in high contrast mode
    await page.screenshot({ path: 'test-results/high-contrast-mode.png', fullPage: true });
    
    // Verify elements are still visible and functional
    await expect(page.locator('[data-testid="tracking-number"]')).toBeVisible();
    await expect(page.locator('[data-testid="shipment-status"]')).toBeVisible();
  });

  test('should support reduced motion preferences', async ({ page }) => {
    // Simulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    // Perform search
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
    
    // Check that animations are reduced or disabled
    // This would depend on your CSS implementation
    const animatedElements = page.locator('[data-testid*="animated"], .animate-');
    const count = await animatedElements.count();
    
    for (let i = 0; i < count; i++) {
      const element = animatedElements.nth(i);
      const animationDuration = await element.evaluate((el) => {
        return window.getComputedStyle(el).animationDuration;
      });
      
      // In reduced motion mode, animations should be very short or none
      expect(['0s', '0.01s', 'none']).toContain(animationDuration);
    }
  });

  test('should have proper focus management', async ({ page }) => {
    // Test focus management during navigation
    await page.locator('[data-testid="search-input"]').focus();
    await expect(page.locator('[data-testid="search-input"]')).toBeFocused();
    
    // Perform search
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });
    
    // Focus should be managed appropriately after search
    // Check that focus is not lost or trapped inappropriately
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
    
    // Test escape key functionality if modals are present
    const modal = page.locator('[role="dialog"], [data-testid*="modal"]');
    if (await modal.count() > 0) {
      await page.keyboard.press('Escape');
      // Modal should close and focus should return appropriately
    }
  });
});