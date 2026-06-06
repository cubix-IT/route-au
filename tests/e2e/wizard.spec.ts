import { test, expect } from '@playwright/test'

// Fill the from-location input and pick the first suggestion
async function setFromLocation(page: any, city = 'Melbourne') {
  // Switch to "Surprise me" mode first (default is "I know where I'm going")
  const surpriseToggle = page.locator('button.htoggle-btn').nth(1)
  await surpriseToggle.waitFor({ timeout: 5_000 })
  await surpriseToggle.click()
  await page.waitForTimeout(500) // animation

  // From-location input in surprise mode
  const fromInput = page.locator('input[placeholder="Your suburb or city"]').first()
  await fromInput.waitFor({ timeout: 5_000 })
  await fromInput.click()
  await fromInput.pressSequentially(city, { delay: 50 })

  // Pick first suggestion (Photon API)
  const suggestion = page.locator('.mu-dropdown-row').first()
  await suggestion.waitFor({ timeout: 10_000 })
  await suggestion.click()
}

test.describe('Wizard flow', () => {
  test('wizard opens from surprise me with from-location set', async ({ page }) => {
    await page.goto('/')
    await setFromLocation(page)
    // Click Surprise me → CTA
    await page.locator('button.mu-btn-primary').filter({ hasText: 'Surprise me' }).first().click()
    await expect(page.locator('.wizard-overlay, .wizard-card').first()).toBeVisible({ timeout: 5_000 })
  })

  test('wizard has date step as first step', async ({ page }) => {
    await page.goto('/')
    await setFromLocation(page)
    await page.locator('button.mu-btn-primary').filter({ hasText: 'Surprise me' }).first().click()
    await page.locator('.wizard-card').waitFor({ timeout: 5_000 })
    // Step 0 is dates — check for date-related text
    await expect(page.getByText(/When|weekend|day trip|overnight/i).first()).toBeVisible()
  })

  test('wizard can be dismissed', async ({ page }) => {
    await page.goto('/')
    await setFromLocation(page)
    await page.locator('button.mu-btn-primary').filter({ hasText: 'Surprise me' }).first().click()
    await page.locator('.wizard-card').waitFor({ timeout: 5_000 })
    // Close button
    const closeBtn = page.locator('.wizard-card button').filter({ hasText: '×' }).first()
    await closeBtn.waitFor({ timeout: 3_000 })
    await closeBtn.click()
    await expect(page.locator('.wizard-overlay')).not.toBeVisible({ timeout: 3_000 })
  })
})
