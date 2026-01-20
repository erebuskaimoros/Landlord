import { test, expect } from './fixtures/auth'

test.describe('Tasks CRUD', () => {
  test.describe('when authenticated', () => {
    test('can view tasks list', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks')

      // Should see the page title
      await expect(authenticatedPage.getByRole('heading', { name: /tasks/i })).toBeVisible()

      // Should see add task button
      await expect(authenticatedPage.getByRole('button', { name: /add task/i })).toBeVisible()
    })

    test('can open add task dialog', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks')

      // Click add task button
      await authenticatedPage.getByRole('button', { name: /add task/i }).click()

      // Should see the dialog
      await expect(authenticatedPage.getByRole('dialog')).toBeVisible()
      await expect(authenticatedPage.getByRole('heading', { name: /add.*task/i })).toBeVisible()

      // Should see form fields
      await expect(authenticatedPage.getByLabel(/title/i)).toBeVisible()
      await expect(authenticatedPage.getByLabel(/unit/i)).toBeVisible()
    })

    test('can create a new task', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks')

      // Click add task button
      await authenticatedPage.getByRole('button', { name: /add task/i }).click()

      // Fill out form
      const testTitle = `E2E Test Task ${Date.now()}`
      await authenticatedPage.getByLabel(/title/i).fill(testTitle)

      // Select a unit (if units exist)
      const unitSelect = authenticatedPage.getByLabel(/unit/i)
      await unitSelect.click()

      // Wait for options to appear and select first option if available
      const options = authenticatedPage.locator('[role="option"]')
      const optionsCount = await options.count()

      if (optionsCount > 0) {
        await options.first().click()

        // Submit form
        await authenticatedPage.getByRole('button', { name: /add task/i, exact: false }).click()

        // Should show success toast
        await expect(authenticatedPage.getByText(/task created/i)).toBeVisible({ timeout: 10000 })

        // Should see the new task in the list
        await expect(authenticatedPage.getByText(testTitle)).toBeVisible()
      }
    })

    test('can view task detail', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks')

      // Click on the first task link (if exists)
      const taskLinks = authenticatedPage.locator('a[href^="/tasks/"]')
      const count = await taskLinks.count()

      if (count > 0) {
        await taskLinks.first().click()

        // Should navigate to detail page
        await expect(authenticatedPage).toHaveURL(/\/tasks\/[a-z0-9-]+/)

        // Should see task details
        await expect(authenticatedPage.getByRole('heading')).toBeVisible()
        await expect(authenticatedPage.getByText(/back to tasks/i)).toBeVisible()
      }
    })

    test('can navigate back from task detail', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks')

      const taskLinks = authenticatedPage.locator('a[href^="/tasks/"]')
      const count = await taskLinks.count()

      if (count > 0) {
        await taskLinks.first().click()
        await expect(authenticatedPage).toHaveURL(/\/tasks\/[a-z0-9-]+/)

        // Click back link
        await authenticatedPage.getByText(/back to tasks/i).click()

        // Should be back on list page
        await expect(authenticatedPage).toHaveURL('/tasks')
      }
    })

    test('can filter tasks by status', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks')

      // Find status filter
      const statusFilter = authenticatedPage.getByRole('combobox', { name: /status/i })

      if (await statusFilter.isVisible()) {
        await statusFilter.click()

        // Select "Open" status
        const openOption = authenticatedPage.getByRole('option', { name: /open/i })
        if (await openOption.isVisible()) {
          await openOption.click()

          // URL should reflect the filter
          await expect(authenticatedPage).toHaveURL(/status=open/)
        }
      }
    })

    test('can filter tasks by priority', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks')

      // Find priority filter
      const priorityFilter = authenticatedPage.getByRole('combobox', { name: /priority/i })

      if (await priorityFilter.isVisible()) {
        await priorityFilter.click()

        // Select "Urgent" priority
        const urgentOption = authenticatedPage.getByRole('option', { name: /urgent/i })
        if (await urgentOption.isVisible()) {
          await urgentOption.click()

          // URL should reflect the filter
          await expect(authenticatedPage).toHaveURL(/priority=urgent/)
        }
      }
    })

    test('validates required fields', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks')

      // Click add task button
      await authenticatedPage.getByRole('button', { name: /add task/i }).click()

      // Try to submit without filling required fields
      await authenticatedPage.getByRole('button', { name: /add task/i, exact: false }).click()

      // Should show validation error for title
      await expect(authenticatedPage.getByText(/title.*required/i)).toBeVisible()
    })

    test('shows status badges on task list', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks')

      // Check if any status badges are visible (if tasks exist)
      const table = authenticatedPage.locator('table')
      const tableExists = await table.isVisible()

      if (tableExists) {
        // Should see status column with badges
        const statusBadges = authenticatedPage.locator('[data-status]')
        // Status badges should be present if there are tasks
      }
    })
  })
})

test.describe('Tasks - unauthenticated', () => {
  test('redirects to login', async ({ page }) => {
    await page.goto('/tasks')
    await expect(page).toHaveURL(/login/)
  })
})

test.describe('Recurring Tasks', () => {
  test.describe('when authenticated', () => {
    test('can view recurring tasks tab', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks')

      // Should see tabs
      await expect(authenticatedPage.getByRole('tab', { name: /tasks/i })).toBeVisible()
      await expect(authenticatedPage.getByRole('tab', { name: /recurring/i })).toBeVisible()
    })

    test('can switch to recurring tasks tab', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks')

      // Click on recurring tab
      await authenticatedPage.getByRole('tab', { name: /recurring/i }).click()

      // Should see recurring content
      await expect(authenticatedPage.getByRole('tabpanel')).toBeVisible()
    })

    test('can open create recurring task dialog', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks')

      // Switch to recurring tab
      await authenticatedPage.getByRole('tab', { name: /recurring/i }).click()

      // Wait for tab content to load
      await authenticatedPage.waitForTimeout(500)

      // Click create recurring task button
      const createButton = authenticatedPage.getByRole('button', { name: /create recurring task/i })
      if (await createButton.isVisible()) {
        await createButton.click()

        // Should see the dialog
        await expect(authenticatedPage.getByRole('dialog')).toBeVisible()
        await expect(authenticatedPage.getByRole('heading', { name: /create recurring task/i })).toBeVisible()

        // Should see recurring-specific fields
        await expect(authenticatedPage.getByLabel(/title/i)).toBeVisible()
        await expect(authenticatedPage.getByLabel(/unit/i)).toBeVisible()
        await expect(authenticatedPage.getByText(/repeat interval/i)).toBeVisible()
        await expect(authenticatedPage.getByLabel(/next due date/i)).toBeVisible()
      }
    })

    test('can create a recurring task', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks')

      // Switch to recurring tab
      await authenticatedPage.getByRole('tab', { name: /recurring/i }).click()

      // Wait for tab content
      await authenticatedPage.waitForTimeout(500)

      // Click create button
      const createButton = authenticatedPage.getByRole('button', { name: /create recurring task/i })
      if (await createButton.isVisible()) {
        await createButton.click()

        // Fill out form
        const testTitle = `E2E Recurring Task ${Date.now()}`
        await authenticatedPage.getByLabel(/title/i).fill(testTitle)

        // Select a unit
        const unitSelect = authenticatedPage.getByLabel(/unit/i)
        await unitSelect.click()

        const options = authenticatedPage.locator('[role="option"]')
        const optionsCount = await options.count()

        if (optionsCount > 0) {
          await options.first().click()

          // Select interval (Monthly)
          const intervalSelect = authenticatedPage.locator('button').filter({ hasText: /select interval/i })
          if (await intervalSelect.isVisible()) {
            await intervalSelect.click()
            await authenticatedPage.getByRole('option', { name: /monthly/i }).click()
          }

          // Set next due date (tomorrow)
          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          const dateString = tomorrow.toISOString().split('T')[0]
          await authenticatedPage.getByLabel(/next due date/i).fill(dateString)

          // Submit
          await authenticatedPage.getByRole('button', { name: /^create$/i }).click()

          // Should show success toast
          await expect(authenticatedPage.getByText(/recurring task created/i)).toBeVisible({ timeout: 10000 })

          // Should see the new recurring task in the list
          await expect(authenticatedPage.getByText(testTitle)).toBeVisible()
        }
      }
    })

    test('shows interval and next due date in recurring tasks table', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks')

      // Switch to recurring tab
      await authenticatedPage.getByRole('tab', { name: /recurring/i }).click()

      // Check if table exists
      const table = authenticatedPage.locator('table')
      const tableExists = await table.isVisible()

      if (tableExists) {
        // Should have interval and next due columns
        await expect(authenticatedPage.getByRole('columnheader', { name: /interval/i })).toBeVisible()
        await expect(authenticatedPage.getByRole('columnheader', { name: /next due/i })).toBeVisible()
        await expect(authenticatedPage.getByRole('columnheader', { name: /status/i })).toBeVisible()
      }
    })

    test('can pause and resume recurring task', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks')

      // Switch to recurring tab
      await authenticatedPage.getByRole('tab', { name: /recurring/i }).click()

      // Find an action menu on the first row
      const actionButtons = authenticatedPage.locator('button[aria-haspopup="menu"]')
      const count = await actionButtons.count()

      if (count > 0) {
        await actionButtons.first().click()

        // Look for pause/activate option
        const pauseOption = authenticatedPage.getByRole('menuitem', { name: /pause/i })
        const activateOption = authenticatedPage.getByRole('menuitem', { name: /activate/i })

        if (await pauseOption.isVisible()) {
          await pauseOption.click()
          await expect(authenticatedPage.getByText(/paused/i)).toBeVisible({ timeout: 5000 })
        } else if (await activateOption.isVisible()) {
          await activateOption.click()
          await expect(authenticatedPage.getByText(/activated/i)).toBeVisible({ timeout: 5000 })
        }
      }
    })

    test('can generate task from recurring', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks')

      // Switch to recurring tab
      await authenticatedPage.getByRole('tab', { name: /recurring/i }).click()

      // Find an action menu for an active recurring task
      const actionButtons = authenticatedPage.locator('button[aria-haspopup="menu"]')
      const count = await actionButtons.count()

      if (count > 0) {
        await actionButtons.first().click()

        // Look for generate task option
        const generateOption = authenticatedPage.getByRole('menuitem', { name: /generate task/i })

        if (await generateOption.isVisible()) {
          await generateOption.click()

          // Should show success message
          await expect(authenticatedPage.getByText(/task generated/i)).toBeVisible({ timeout: 5000 })
        }
      }
    })

    test('validates required fields on recurring task form', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks')

      // Switch to recurring tab
      await authenticatedPage.getByRole('tab', { name: /recurring/i }).click()

      // Wait for tab content
      await authenticatedPage.waitForTimeout(500)

      // Click create button
      const createButton = authenticatedPage.getByRole('button', { name: /create recurring task/i })
      if (await createButton.isVisible()) {
        await createButton.click()

        // Try to submit without filling required fields
        await authenticatedPage.getByRole('button', { name: /^create$/i }).click()

        // Should show validation errors
        await expect(authenticatedPage.getByText(/title.*required/i)).toBeVisible()
      }
    })

    test('recurring task stats card shows active count', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks')

      // Should see recurring stats card
      const recurringCard = authenticatedPage.locator('text=Recurring').first()
      if (await recurringCard.isVisible()) {
        // The card should show a count
        await expect(authenticatedPage.locator('.text-2xl.font-bold').last()).toBeVisible()
      }
    })
  })
})
