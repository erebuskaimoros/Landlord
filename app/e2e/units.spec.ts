import { test, expect } from './fixtures/auth'

test.describe('Units CRUD', () => {
  test.describe('when authenticated', () => {
    test('can view units list', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/units')

      // Should see the page title
      await expect(authenticatedPage.getByRole('heading', { name: /units/i })).toBeVisible()

      // Should see add unit button
      await expect(authenticatedPage.getByRole('button', { name: /add unit/i })).toBeVisible()
    })

    test('can open add unit dialog', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/units')

      // Click add unit button
      await authenticatedPage.getByRole('button', { name: /add unit/i }).click()

      // Should see the dialog
      await expect(authenticatedPage.getByRole('dialog')).toBeVisible()
      await expect(authenticatedPage.getByRole('heading', { name: /add new unit/i })).toBeVisible()

      // Should see form fields
      await expect(authenticatedPage.getByLabel(/address/i)).toBeVisible()
      await expect(authenticatedPage.getByLabel(/status/i)).toBeVisible()
    })

    test('can create a new unit', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/units')

      // Click add unit button
      await authenticatedPage.getByRole('button', { name: /add unit/i }).click()

      // Fill out form
      const testAddress = `E2E Test Unit ${Date.now()}`
      await authenticatedPage.getByLabel(/^address/i).fill(testAddress)
      await authenticatedPage.getByLabel(/city/i).fill('Test City')
      await authenticatedPage.getByLabel(/state/i).fill('TS')
      await authenticatedPage.getByLabel(/zip/i).fill('12345')

      // Submit form
      await authenticatedPage.getByRole('button', { name: /add unit/i, exact: false }).click()

      // Should show success toast
      await expect(authenticatedPage.getByText(/unit created/i)).toBeVisible({ timeout: 10000 })

      // Should see the new unit in the list
      await expect(authenticatedPage.getByText(testAddress)).toBeVisible()
    })

    test('can view unit detail', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/units')

      // Click on the first unit link (if exists)
      const unitLinks = authenticatedPage.locator('a[href^="/units/"]')
      const count = await unitLinks.count()

      if (count > 0) {
        await unitLinks.first().click()

        // Should navigate to detail page
        await expect(authenticatedPage).toHaveURL(/\/units\/[a-z0-9-]+/)

        // Should see unit details
        await expect(authenticatedPage.getByRole('heading')).toBeVisible()
        await expect(authenticatedPage.getByText(/back to units/i)).toBeVisible()
      }
    })

    test('can navigate back from unit detail', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/units')

      const unitLinks = authenticatedPage.locator('a[href^="/units/"]')
      const count = await unitLinks.count()

      if (count > 0) {
        await unitLinks.first().click()
        await expect(authenticatedPage).toHaveURL(/\/units\/[a-z0-9-]+/)

        // Click back link
        await authenticatedPage.getByText(/back to units/i).click()

        // Should be back on list page
        await expect(authenticatedPage).toHaveURL('/units')
      }
    })
  })
})

test.describe('Units - unauthenticated', () => {
  test('redirects to login', async ({ page }) => {
    await page.goto('/units')
    await expect(page).toHaveURL(/login/)
  })
})
