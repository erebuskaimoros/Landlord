import { test, expect } from './fixtures/auth'

test.describe('Contractors CRUD', () => {
  test.describe('when authenticated', () => {
    test('can view contractors list', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/contractors')

      // Should see the page title
      await expect(authenticatedPage.getByRole('heading', { name: /contractors/i })).toBeVisible()

      // Should see add contractor button
      await expect(authenticatedPage.getByRole('button', { name: /add contractor/i })).toBeVisible()
    })

    test('can open add contractor dialog', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/contractors')

      // Click add contractor button
      await authenticatedPage.getByRole('button', { name: /add contractor/i }).click()

      // Should see the dialog
      await expect(authenticatedPage.getByRole('dialog')).toBeVisible()
      await expect(authenticatedPage.getByRole('heading', { name: /add.*contractor/i })).toBeVisible()

      // Should see form fields
      await expect(authenticatedPage.getByLabel(/name/i)).toBeVisible()
      await expect(authenticatedPage.getByLabel(/email/i)).toBeVisible()
    })

    test('can create a new contractor', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/contractors')

      // Click add contractor button
      await authenticatedPage.getByRole('button', { name: /add contractor/i }).click()

      // Fill out form
      const testName = `E2E Test Contractor ${Date.now()}`
      await authenticatedPage.getByLabel(/^name/i).fill(testName)
      await authenticatedPage.getByLabel(/email/i).fill('test@contractor.com')
      await authenticatedPage.getByLabel(/phone/i).fill('555-123-4567')

      // Submit form
      await authenticatedPage.getByRole('button', { name: /add contractor/i, exact: false }).click()

      // Should show success toast
      await expect(authenticatedPage.getByText(/contractor created/i)).toBeVisible({ timeout: 10000 })

      // Should see the new contractor in the list
      await expect(authenticatedPage.getByText(testName)).toBeVisible()
    })

    test('can view contractor detail', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/contractors')

      // Click on the first contractor link (if exists)
      const contractorLinks = authenticatedPage.locator('a[href^="/contractors/"]')
      const count = await contractorLinks.count()

      if (count > 0) {
        await contractorLinks.first().click()

        // Should navigate to detail page
        await expect(authenticatedPage).toHaveURL(/\/contractors\/[a-z0-9-]+/)

        // Should see contractor details
        await expect(authenticatedPage.getByRole('heading')).toBeVisible()
        await expect(authenticatedPage.getByText(/back to contractors/i)).toBeVisible()
      }
    })

    test('can navigate back from contractor detail', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/contractors')

      const contractorLinks = authenticatedPage.locator('a[href^="/contractors/"]')
      const count = await contractorLinks.count()

      if (count > 0) {
        await contractorLinks.first().click()
        await expect(authenticatedPage).toHaveURL(/\/contractors\/[a-z0-9-]+/)

        // Click back link
        await authenticatedPage.getByText(/back to contractors/i).click()

        // Should be back on list page
        await expect(authenticatedPage).toHaveURL('/contractors')
      }
    })

    test('validates required fields', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/contractors')

      // Click add contractor button
      await authenticatedPage.getByRole('button', { name: /add contractor/i }).click()

      // Try to submit without filling required fields
      await authenticatedPage.getByRole('button', { name: /add contractor/i, exact: false }).click()

      // Should show validation error for name
      await expect(authenticatedPage.getByText(/name.*required/i)).toBeVisible()
    })

    test('validates email format', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/contractors')

      // Click add contractor button
      await authenticatedPage.getByRole('button', { name: /add contractor/i }).click()

      // Fill invalid email
      await authenticatedPage.getByLabel(/^name/i).fill('Test Contractor')
      await authenticatedPage.getByLabel(/email/i).fill('invalid-email')

      // Submit form
      await authenticatedPage.getByRole('button', { name: /add contractor/i, exact: false }).click()

      // Should show validation error for email
      await expect(authenticatedPage.getByText(/invalid.*email/i)).toBeVisible()
    })
  })
})

test.describe('Contractors - unauthenticated', () => {
  test('redirects to login', async ({ page }) => {
    await page.goto('/contractors')
    await expect(page).toHaveURL(/login/)
  })
})
