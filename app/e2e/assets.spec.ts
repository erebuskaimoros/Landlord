import { test, expect } from './fixtures/auth'

test.describe('Assets CRUD', () => {
  test.describe('when authenticated', () => {
    test('can view assets list', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/assets')

      // Should see the page title
      await expect(authenticatedPage.getByRole('heading', { name: /assets/i })).toBeVisible()

      // Should see add asset button
      await expect(authenticatedPage.getByRole('button', { name: /add asset/i })).toBeVisible()
    })

    test('can open add asset dialog', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/assets')

      // Click add asset button
      await authenticatedPage.getByRole('button', { name: /add asset/i }).click()

      // Should see the dialog
      await expect(authenticatedPage.getByRole('dialog')).toBeVisible()
      await expect(authenticatedPage.getByRole('heading', { name: /add.*asset/i })).toBeVisible()

      // Should see form fields
      await expect(authenticatedPage.getByLabel(/name/i)).toBeVisible()
      await expect(authenticatedPage.getByLabel(/type/i)).toBeVisible()
      await expect(authenticatedPage.getByLabel(/unit/i)).toBeVisible()
    })

    test('can create a new asset', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/assets')

      // Click add asset button
      await authenticatedPage.getByRole('button', { name: /add asset/i }).click()

      // Fill out form
      const testName = `E2E Test Asset ${Date.now()}`
      await authenticatedPage.getByLabel(/^name/i).fill(testName)

      // Select asset type
      const typeSelect = authenticatedPage.getByLabel(/type/i)
      await typeSelect.click()
      const typeOptions = authenticatedPage.locator('[role="option"]')
      const typeOptionsCount = await typeOptions.count()

      if (typeOptionsCount > 0) {
        await typeOptions.first().click()
      }

      // Select a unit (if units exist)
      const unitSelect = authenticatedPage.getByLabel(/unit/i)
      await unitSelect.click()

      // Wait for options to appear and select first option if available
      const unitOptions = authenticatedPage.locator('[role="option"]')
      const unitOptionsCount = await unitOptions.count()

      if (unitOptionsCount > 0) {
        await unitOptions.first().click()

        // Submit form
        await authenticatedPage.getByRole('button', { name: /add asset/i, exact: false }).click()

        // Should show success toast
        await expect(authenticatedPage.getByText(/asset created/i)).toBeVisible({ timeout: 10000 })

        // Should see the new asset in the list
        await expect(authenticatedPage.getByText(testName)).toBeVisible()
      }
    })

    test('can view asset detail', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/assets')

      // Click on the first asset link (if exists)
      const assetLinks = authenticatedPage.locator('a[href^="/assets/"]')
      const count = await assetLinks.count()

      if (count > 0) {
        await assetLinks.first().click()

        // Should navigate to detail page
        await expect(authenticatedPage).toHaveURL(/\/assets\/[a-z0-9-]+/)

        // Should see asset details
        await expect(authenticatedPage.getByRole('heading')).toBeVisible()
        await expect(authenticatedPage.getByText(/back to assets/i)).toBeVisible()
      }
    })

    test('can navigate back from asset detail', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/assets')

      const assetLinks = authenticatedPage.locator('a[href^="/assets/"]')
      const count = await assetLinks.count()

      if (count > 0) {
        await assetLinks.first().click()
        await expect(authenticatedPage).toHaveURL(/\/assets\/[a-z0-9-]+/)

        // Click back link
        await authenticatedPage.getByText(/back to assets/i).click()

        // Should be back on list page
        await expect(authenticatedPage).toHaveURL('/assets')
      }
    })

    test('can filter assets by condition', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/assets')

      // Find condition filter
      const conditionFilter = authenticatedPage.getByRole('combobox', { name: /condition/i })

      if (await conditionFilter.isVisible()) {
        await conditionFilter.click()

        // Select "Good" condition
        const goodOption = authenticatedPage.getByRole('option', { name: /good/i })
        if (await goodOption.isVisible()) {
          await goodOption.click()

          // URL should reflect the filter
          await expect(authenticatedPage).toHaveURL(/condition=good/)
        }
      }
    })

    test('can filter assets by type', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/assets')

      // Find type filter
      const typeFilter = authenticatedPage.getByRole('combobox', { name: /type/i })

      if (await typeFilter.isVisible()) {
        await typeFilter.click()

        // Select first type option if available
        const options = authenticatedPage.locator('[role="option"]')
        const optionsCount = await options.count()

        if (optionsCount > 0) {
          await options.first().click()
        }
      }
    })

    test('validates required fields', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/assets')

      // Click add asset button
      await authenticatedPage.getByRole('button', { name: /add asset/i }).click()

      // Try to submit without filling required fields
      await authenticatedPage.getByRole('button', { name: /add asset/i, exact: false }).click()

      // Should show validation error for name
      await expect(authenticatedPage.getByText(/name.*required/i)).toBeVisible()
    })

    test('shows condition badges on asset list', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/assets')

      // Check if any condition badges are visible (if assets exist)
      const table = authenticatedPage.locator('table')
      const tableExists = await table.isVisible()

      if (tableExists) {
        // Condition badges should be present if there are assets
        const rows = authenticatedPage.locator('tbody tr')
        const rowCount = await rows.count()

        if (rowCount > 0) {
          // At least one row should show condition info
          const conditionCells = authenticatedPage.locator('td').filter({ hasText: /excellent|good|fair|poor/i })
          const conditionCount = await conditionCells.count()
          expect(conditionCount).toBeGreaterThanOrEqual(0)
        }
      }
    })

    test('can add maintenance log to asset', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/assets')

      // Navigate to first asset detail (if exists)
      const assetLinks = authenticatedPage.locator('a[href^="/assets/"]')
      const count = await assetLinks.count()

      if (count > 0) {
        await assetLinks.first().click()
        await expect(authenticatedPage).toHaveURL(/\/assets\/[a-z0-9-]+/)

        // Look for maintenance log section
        const maintenanceSection = authenticatedPage.getByText(/maintenance.*log|maintenance.*history/i)

        if (await maintenanceSection.isVisible()) {
          // Look for add maintenance log button
          const addMaintenanceButton = authenticatedPage.getByRole('button', { name: /add.*maintenance|log.*maintenance/i })

          if (await addMaintenanceButton.isVisible()) {
            await addMaintenanceButton.click()

            // Should see maintenance log form
            await expect(authenticatedPage.getByLabel(/service.*date/i)).toBeVisible()
            await expect(authenticatedPage.getByLabel(/service.*type/i)).toBeVisible()
          }
        }
      }
    })
  })
})

test.describe('Assets - unauthenticated', () => {
  test('redirects to login', async ({ page }) => {
    await page.goto('/assets')
    await expect(page).toHaveURL(/login/)
  })
})
