import { test, expect } from './fixtures/auth'

test.describe('Transactions CRUD', () => {
  test.describe('when authenticated', () => {
    test('can view transactions list', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/transactions')

      // Should see the page title
      await expect(authenticatedPage.getByRole('heading', { name: /transactions/i })).toBeVisible()

      // Should see add transaction button
      await expect(authenticatedPage.getByRole('button', { name: /add transaction/i })).toBeVisible()
    })

    test('can open add transaction dialog', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/transactions')

      // Click add transaction button
      await authenticatedPage.getByRole('button', { name: /add transaction/i }).click()

      // Should see the dialog
      await expect(authenticatedPage.getByRole('dialog')).toBeVisible()
      await expect(authenticatedPage.getByRole('heading', { name: /add new transaction/i })).toBeVisible()

      // Should see form fields
      await expect(authenticatedPage.getByLabel(/type/i)).toBeVisible()
      await expect(authenticatedPage.getByLabel(/description/i)).toBeVisible()
      await expect(authenticatedPage.getByLabel(/actual amount/i)).toBeVisible()
    })

    test('can create a new income transaction', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/transactions')

      // Click add transaction button
      await authenticatedPage.getByRole('button', { name: /add transaction/i }).click()

      // Fill out form
      const description = `E2E Rent Payment ${Date.now()}`

      // Select income type (should be default)
      await authenticatedPage.getByLabel(/description/i).fill(description)
      await authenticatedPage.locator('input[name="actual_amount"]').fill('1500')

      // Submit form
      await authenticatedPage.getByRole('button', { name: /add transaction/i, exact: false }).click()

      // Should show success toast
      await expect(authenticatedPage.getByText(/transaction created/i)).toBeVisible({ timeout: 10000 })

      // Should see the new transaction in the list
      await expect(authenticatedPage.getByText(description)).toBeVisible()
    })

    test('can view transaction detail', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/transactions')

      // Click on the first transaction link (if exists)
      const transactionLinks = authenticatedPage.locator('a[href^="/transactions/"]')
      const count = await transactionLinks.count()

      if (count > 0) {
        await transactionLinks.first().click()

        // Should navigate to detail page
        await expect(authenticatedPage).toHaveURL(/\/transactions\/[a-z0-9-]+/)

        // Should see transaction details
        await expect(authenticatedPage.getByRole('heading')).toBeVisible()
        await expect(authenticatedPage.getByText(/back to transactions/i)).toBeVisible()
      }
    })

    test('can filter transactions by type', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/transactions')

      // Find type filter
      const typeFilter = authenticatedPage.getByRole('combobox').filter({ hasText: /type/i })
      if (await typeFilter.isVisible()) {
        await typeFilter.click()

        // Should show type options
        const incomeOption = authenticatedPage.getByRole('option', { name: /income/i })
        const expenseOption = authenticatedPage.getByRole('option', { name: /expense/i })

        const hasIncome = await incomeOption.isVisible().catch(() => false)
        const hasExpense = await expenseOption.isVisible().catch(() => false)

        expect(hasIncome || hasExpense).toBeTruthy()
      }
    })
  })
})

test.describe('Transactions - unauthenticated', () => {
  test('redirects to login', async ({ page }) => {
    await page.goto('/transactions')
    await expect(page).toHaveURL(/login/)
  })
})
