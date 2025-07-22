import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Automated Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should not have any automatically detectable accessibility issues on homepage', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have accessibility issues on search results page', async ({ page }) => {
    // Perform search to get results page
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have accessibility issues in error states', async ({ page }) => {
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
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have accessibility issues in loading states', async ({ page }) => {
    // Delay API response to capture loading state
    await page.route('**/api/track**', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    
    // Scan during loading state
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper color contrast ratios', async ({ page }) => {
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('[data-testid="shipment-details"]')
      .analyze();

    // Check specifically for color contrast violations
    const colorContrastViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'color-contrast'
    );

    expect(colorContrastViolations).toEqual([]);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['heading-order'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper form labels and associations', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['label', 'label-title-only', 'form-field-multiple-labels'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper ARIA attributes', async ({ page }) => {
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules([
        'aria-allowed-attr',
        'aria-required-attr',
        'aria-valid-attr-value',
        'aria-valid-attr'
      ])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should be keyboard navigable', async ({ page }) => {
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="search-input"]')).toBeFocused();

    await page.keyboard.type('DEMO123456789');
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="search-button"]')).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });

    // Check for keyboard trap violations
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['focus-order-semantics', 'tabindex'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should work with screen readers', async ({ page }) => {
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });

    // Check for screen reader compatibility
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules([
        'bypass',
        'document-title',
        'html-has-lang',
        'landmark-one-main',
        'page-has-heading-one',
        'region'
      ])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should handle high contrast mode', async ({ page }) => {
    // Enable high contrast mode
    await page.emulateMedia({ forcedColors: 'active' });

    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });

    // Check accessibility in high contrast mode
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should handle reduced motion preferences', async ({ page }) => {
    // Enable reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });

    // Check that animations don't cause accessibility issues
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['motion'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have accessible mobile experience', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });

    // Check mobile accessibility
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should generate accessibility report', async ({ page }) => {
    await page.locator('[data-testid="search-input"]').fill('DEMO123456789');
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="shipment-details"]')).toBeVisible({ timeout: 15000 });

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    // Generate detailed report
    console.log('Accessibility Scan Results:');
    console.log(`- ${accessibilityScanResults.passes.length} checks passed`);
    console.log(`- ${accessibilityScanResults.violations.length} violations found`);
    console.log(`- ${accessibilityScanResults.incomplete.length} incomplete checks`);
    console.log(`- ${accessibilityScanResults.inapplicable.length} inapplicable checks`);

    if (accessibilityScanResults.violations.length > 0) {
      console.log('\nViolations:');
      accessibilityScanResults.violations.forEach((violation, index) => {
        console.log(`${index + 1}. ${violation.id}: ${violation.description}`);
        console.log(`   Impact: ${violation.impact}`);
        console.log(`   Help: ${violation.helpUrl}`);
      });
    }

    // Save detailed report to file
    const fs = require('fs');
    const reportPath = 'test-results/accessibility-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(accessibilityScanResults, null, 2));

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});