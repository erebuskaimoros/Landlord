import { test, expect } from './fixtures/auth'

test.describe('Leases CRUD', () => {
  test.describe('when authenticated', () => {
    test('can view leases list', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/leases')

      // Should see the page title
      await expect(authenticatedPage.getByRole('heading', { name: /leases/i })).toBeVisible()

      // Should see add lease button
      await expect(authenticatedPage.getByRole('button', { name: /add lease/i })).toBeVisible()
    })

    test('can open add lease dialog', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/leases')

      // Click add lease button
      await authenticatedPage.getByRole('button', { name: /add lease/i }).click()

      // Should see the dialog
      await expect(authenticatedPage.getByRole('dialog')).toBeVisible()
      await expect(authenticatedPage.getByRole('heading', { name: /add new lease/i })).toBeVisible()

      // Should see form fields
      await expect(authenticatedPage.getByLabel(/tenant/i)).toBeVisible()
      await expect(authenticatedPage.getByLabel(/unit/i)).toBeVisible()
      await expect(authenticatedPage.getByLabel(/rent amount/i)).toBeVisible()
    })

    test('can view lease detail', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/leases')

      // Click on the first lease link (if exists)
      const leaseLinks = authenticatedPage.locator('a[href^="/leases/"]')
      const count = await leaseLinks.count()

      if (count > 0) {
        await leaseLinks.first().click()

        // Should navigate to detail page
        await expect(authenticatedPage).toHaveURL(/\/leases\/[a-z0-9-]+/)

        // Should see lease details
        await expect(authenticatedPage.getByRole('heading')).toBeVisible()
        await expect(authenticatedPage.getByText(/back to leases/i)).toBeVisible()
      }
    })

    test('can filter leases by status', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/leases')

      // Find status filter
      const statusFilter = authenticatedPage.getByRole('combobox').filter({ hasText: /status/i })
      if (await statusFilter.isVisible()) {
        await statusFilter.click()

        // Should show status options
        await expect(authenticatedPage.getByRole('option', { name: /active/i })).toBeVisible()
      }
    })
  })
})

test.describe('Leases - unauthenticated', () => {
  test('redirects to login', async ({ page }) => {
    await page.goto('/leases')
    await expect(page).toHaveURL(/login/)
  })
})
