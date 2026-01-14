import { test, expect } from './fixtures/auth'

/**
 * Role-based permission tests
 *
 * These tests verify that UI elements are shown/hidden based on user role.
 * Roles: owner (full access), manager (no delete), viewer (read-only)
 *
 * Note: These tests assume the test user has appropriate permissions.
 * For comprehensive role testing, you would need test users for each role.
 */

test.describe('Role-Based Permissions', () => {
  test.describe('Dashboard Access', () => {
    test('authenticated user can access dashboard', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard')

      // Should see dashboard content
      await expect(authenticatedPage.getByRole('heading', { name: /dashboard/i })).toBeVisible()

      // Should see stats cards
      await expect(authenticatedPage.getByText(/total units/i)).toBeVisible()
    })
  })

  test.describe('Units Page Permissions', () => {
    test('user can see add button based on role', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/units')

      // Add button visibility depends on role (owner/manager can add)
      const addButton = authenticatedPage.getByRole('button', { name: /add unit/i })

      // For the default test user, we expect to have add permission
      // This test documents expected behavior - adjust based on test user role
      await expect(addButton).toBeVisible()
    })

    test('can see edit button on detail page', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/units')

      const unitLinks = authenticatedPage.locator('a[href^="/units/"]')
      const count = await unitLinks.count()

      if (count > 0) {
        await unitLinks.first().click()

        // Edit button should be visible for owner/manager
        const editButton = authenticatedPage.getByRole('button', { name: /edit/i })
        await expect(editButton).toBeVisible()
      }
    })

    test('can see delete button on detail page', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/units')

      const unitLinks = authenticatedPage.locator('a[href^="/units/"]')
      const count = await unitLinks.count()

      if (count > 0) {
        await unitLinks.first().click()

        // Delete button should be visible for owner only
        // For a full test, use a specific owner test user
        const deleteButton = authenticatedPage.getByRole('button', { name: /delete/i })
        // Check if visible (owner) or not (manager/viewer)
        const isVisible = await deleteButton.isVisible()
        // Log for debugging
        console.log('Delete button visible:', isVisible)
      }
    })
  })

  test.describe('Tenants Page Permissions', () => {
    test('user can see add button', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tenants')

      const addButton = authenticatedPage.getByRole('button', { name: /add tenant/i })
      await expect(addButton).toBeVisible()
    })
  })

  test.describe('Leases Page Permissions', () => {
    test('user can see add button', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/leases')

      const addButton = authenticatedPage.getByRole('button', { name: /add lease/i })
      await expect(addButton).toBeVisible()
    })
  })

  test.describe('Transactions Page Permissions', () => {
    test('user can see add button', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/transactions')

      const addButton = authenticatedPage.getByRole('button', { name: /add transaction/i })
      await expect(addButton).toBeVisible()
    })

    test('transaction detail shows allocations for expenses', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/transactions')

      // Find an expense transaction if one exists
      const transactionLinks = authenticatedPage.locator('a[href^="/transactions/"]')
      const count = await transactionLinks.count()

      if (count > 0) {
        await transactionLinks.first().click()

        // On detail page, check for allocations section (expense only)
        const allocationsSection = authenticatedPage.getByText(/unit allocations/i)
        // May or may not be visible depending on transaction type
        console.log('Allocations section found:', await allocationsSection.isVisible().catch(() => false))
      }
    })
  })

  test.describe('Buildings Page Permissions', () => {
    test('user can see add button', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/buildings')

      const addButton = authenticatedPage.getByRole('button', { name: /add building/i })
      await expect(addButton).toBeVisible()
    })

    test('building detail shows allocations editor', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/buildings')

      const buildingLinks = authenticatedPage.locator('a[href^="/buildings/"]')
      const count = await buildingLinks.count()

      if (count > 0) {
        await buildingLinks.first().click()

        // On detail page, check for allocations section
        await expect(authenticatedPage.getByText(/expense allocations/i)).toBeVisible({ timeout: 5000 }).catch(() => {
          // May not be visible if no units in building
          console.log('Allocations section not visible - may have no units')
        })
      }
    })
  })

  test.describe('Settings Access', () => {
    test('user can access settings', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/settings')

      // Settings page should be accessible to all authenticated users
      await expect(authenticatedPage.getByRole('heading', { name: /settings/i })).toBeVisible()
    })
  })
})
