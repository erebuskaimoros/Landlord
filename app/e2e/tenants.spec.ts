import { test, expect } from './fixtures/auth'

test.describe('Tenants CRUD', () => {
  test.describe('when authenticated', () => {
    test('can view tenants list', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tenants')

      // Should see the page title
      await expect(authenticatedPage.getByRole('heading', { name: /tenants/i })).toBeVisible()

      // Should see add tenant button
      await expect(authenticatedPage.getByRole('button', { name: /add tenant/i })).toBeVisible()
    })

    test('can open add tenant dialog', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tenants')

      // Click add tenant button
      await authenticatedPage.getByRole('button', { name: /add tenant/i }).click()

      // Should see the dialog
      await expect(authenticatedPage.getByRole('dialog')).toBeVisible()
      await expect(authenticatedPage.getByRole('heading', { name: /add new tenant/i })).toBeVisible()

      // Should see form fields
      await expect(authenticatedPage.getByLabel(/first name/i)).toBeVisible()
      await expect(authenticatedPage.getByLabel(/last name/i)).toBeVisible()
    })

    test('can create a new tenant', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tenants')

      // Click add tenant button
      await authenticatedPage.getByRole('button', { name: /add tenant/i }).click()

      // Fill out form
      const uniqueId = Date.now()
      await authenticatedPage.getByLabel(/first name/i).fill(`E2E`)
      await authenticatedPage.getByLabel(/last name/i).fill(`Test ${uniqueId}`)
      await authenticatedPage.getByLabel(/email/i).fill(`e2e-${uniqueId}@test.com`)
      await authenticatedPage.getByLabel(/phone/i).fill('555-123-4567')

      // Submit form
      await authenticatedPage.getByRole('button', { name: /add tenant/i, exact: false }).click()

      // Should show success toast
      await expect(authenticatedPage.getByText(/tenant created/i)).toBeVisible({ timeout: 10000 })

      // Should see the new tenant in the list
      await expect(authenticatedPage.getByText(`E2E Test ${uniqueId}`)).toBeVisible()
    })

    test('can view tenant detail', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tenants')

      // Click on the first tenant link (if exists)
      const tenantLinks = authenticatedPage.locator('a[href^="/tenants/"]')
      const count = await tenantLinks.count()

      if (count > 0) {
        await tenantLinks.first().click()

        // Should navigate to detail page
        await expect(authenticatedPage).toHaveURL(/\/tenants\/[a-z0-9-]+/)

        // Should see tenant details
        await expect(authenticatedPage.getByRole('heading')).toBeVisible()
        await expect(authenticatedPage.getByText(/back to tenants/i)).toBeVisible()
      }
    })

    test('can search for tenants', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tenants')

      // Find search input
      const searchInput = authenticatedPage.getByPlaceholder(/search/i)
      if (await searchInput.isVisible()) {
        await searchInput.fill('test')

        // Should filter the list (or show no results message)
        await authenticatedPage.waitForTimeout(500) // Debounce wait
      }
    })
  })
})

test.describe('Tenants - unauthenticated', () => {
  test('redirects to login', async ({ page }) => {
    await page.goto('/tenants')
    await expect(page).toHaveURL(/login/)
  })
})
