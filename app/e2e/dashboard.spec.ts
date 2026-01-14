import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  // Note: These tests require authentication setup
  // In a real scenario, you would use Playwright fixtures to handle auth

  test.describe('Unauthenticated', () => {
    test('redirects to login when accessing dashboard without auth', async ({ page }) => {
      await page.goto('/dashboard')
      await expect(page).toHaveURL(/.*login/)
    })

    test('redirects to login when accessing units without auth', async ({ page }) => {
      await page.goto('/units')
      await expect(page).toHaveURL(/.*login/)
    })

    test('redirects to login when accessing tenants without auth', async ({ page }) => {
      await page.goto('/tenants')
      await expect(page).toHaveURL(/.*login/)
    })

    test('redirects to login when accessing leases without auth', async ({ page }) => {
      await page.goto('/leases')
      await expect(page).toHaveURL(/.*login/)
    })

    test('redirects to login when accessing transactions without auth', async ({ page }) => {
      await page.goto('/transactions')
      await expect(page).toHaveURL(/.*login/)
    })

    test('redirects to login when accessing settings without auth', async ({ page }) => {
      await page.goto('/settings')
      await expect(page).toHaveURL(/.*login/)
    })
  })
})
