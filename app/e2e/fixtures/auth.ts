import { test as base, expect } from '@playwright/test'

// Test user credentials - these should match a seeded test user
// For local testing, create a test user with these credentials
const TEST_USER = {
  email: process.env.E2E_TEST_EMAIL || 'e2e-test@example.com',
  password: process.env.E2E_TEST_PASSWORD || 'testpassword123',
}

export type AuthFixtures = {
  authenticatedPage: typeof import('@playwright/test').Page
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login page
    await page.goto('/login')

    // Fill in credentials
    await page.getByLabel('Email').fill(TEST_USER.email)
    await page.getByLabel('Password').fill(TEST_USER.password)

    // Submit login form
    await page.getByRole('button', { name: 'Sign in' }).click()

    // Wait for successful redirect to dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })

    // Use the authenticated page
    await use(page)
  },
})

export { expect }
