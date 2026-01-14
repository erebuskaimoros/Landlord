import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test.describe('Public Routes', () => {
    test('can access login page', async ({ page }) => {
      const response = await page.goto('/login')
      expect(response?.status()).toBe(200)
      await expect(page).toHaveTitle(/Landlord/)
    })

    test('can access signup page', async ({ page }) => {
      const response = await page.goto('/signup')
      expect(response?.status()).toBe(200)
      await expect(page).toHaveTitle(/Landlord/)
    })

    test('root redirects appropriately', async ({ page }) => {
      await page.goto('/')
      // Should redirect to either login or dashboard based on auth state
      await expect(page).toHaveURL(/\/(login|dashboard)/)
    })
  })

  test.describe('Protected Routes Redirect', () => {
    const protectedRoutes = [
      '/dashboard',
      '/units',
      '/units/new',
      '/buildings',
      '/tenants',
      '/leases',
      '/transactions',
      '/settings',
    ]

    for (const route of protectedRoutes) {
      test(`${route} redirects to login when unauthenticated`, async ({ page }) => {
        await page.goto(route)
        await expect(page).toHaveURL(/.*login/)
      })
    }
  })

  test.describe('Auth Flow Navigation', () => {
    test('can navigate from login to signup and back', async ({ page }) => {
      // Start at login
      await page.goto('/login')
      await expect(page).toHaveURL(/.*login/)

      // Go to signup
      await page.getByRole('link', { name: 'Sign up' }).click()
      await expect(page).toHaveURL(/.*signup/)

      // Go back to login
      await page.getByRole('link', { name: 'Sign in' }).click()
      await expect(page).toHaveURL(/.*login/)
    })

    test('can use browser back button', async ({ page }) => {
      await page.goto('/login')
      await page.getByRole('link', { name: 'Sign up' }).click()
      await expect(page).toHaveURL(/.*signup/)

      // Use browser back
      await page.goBack()
      await expect(page).toHaveURL(/.*login/)
    })
  })

  test.describe('Page Titles', () => {
    test('login page has proper title', async ({ page }) => {
      await page.goto('/login')
      await expect(page).toHaveTitle(/Landlord/)
    })

    test('signup page has proper title', async ({ page }) => {
      await page.goto('/signup')
      await expect(page).toHaveTitle(/Landlord/)
    })
  })

  test.describe('Error Handling', () => {
    test('404 page for invalid routes', async ({ page }) => {
      const response = await page.goto('/invalid-page-that-does-not-exist')
      // Next.js returns 404 for invalid routes
      expect(response?.status()).toBe(404)
    })
  })
})
