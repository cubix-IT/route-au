import { test, expect } from '@playwright/test'

// Hero has two modes: "I know where I'm going" (default) and "Surprise me".
// Click the "Surprise me" toggle button to switch modes.
async function switchToSurpriseMode(page: any) {
  // The toggle button says "Surprise me" (no arrow — that's the toggle, not the CTA)
  const toggle = page.locator('button.htoggle-btn').nth(1)
  await toggle.waitFor({ timeout: 5_000 })
  await toggle.click()
  // Wait for animation (cardPhase: out→in takes ~420ms)
  await page.waitForTimeout(500)
}

test.describe('Landing page', () => {
  test('loads and shows hero', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Unplanned Escapes/i)
    // Default mode: "I know where I'm going" — check for Know mode CTA or search input
    await expect(page.locator('input').first()).toBeVisible({ timeout: 5_000 })
  })

  test('surprise me CTA visible after toggle', async ({ page }) => {
    await page.goto('/')
    await switchToSurpriseMode(page)
    // Now the "Surprise me →" CTA button should be visible
    await expect(page.locator('button.mu-btn-primary').filter({ hasText: 'Surprise me' }).first()).toBeVisible({ timeout: 5_000 })
  })

  test('shows destination cards', async ({ page }) => {
    await page.goto('/')
    // Destination cards load from Supabase — wait up to 12s
    await expect(page.locator('.mu-card, .cluster-card, [class*="card"]').first()).toBeVisible({ timeout: 12_000 })
  })

  test('from-location required validation in surprise mode', async ({ page }) => {
    await page.goto('/')
    await switchToSurpriseMode(page)
    // Click CTA without a from-location
    await page.locator('button.mu-btn-primary').filter({ hasText: 'Surprise me' }).first().click()
    // Should show "required" error text
    await expect(page.locator('text=required')).toBeVisible({ timeout: 3_000 })
  })

  test('destination search dropdown appears in know mode', async ({ page }) => {
    await page.goto('/')
    // Wait for destinations to load (cards appear = data is ready)
    await page.locator('.mu-card, [class*="card"], [class*="cluster"]').first().waitFor({ timeout: 12_000 })
    // Destination search is client-side on pre-loaded Supabase data
    const destInput = page.locator('input[placeholder="Search a destination…"]').first()
    await destInput.waitFor({ timeout: 5_000 })
    await destInput.click()
    await destInput.pressSequentially('Yarra', { delay: 50 })
    const dropdown = page.locator('.mu-dropdown-row').first()
    await expect(dropdown).toBeVisible({ timeout: 5_000 })
  })
})
