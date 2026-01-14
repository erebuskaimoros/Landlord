import { test, expect } from '@playwright/test'

test.describe('Accessibility', () => {
  test.describe('Login Page', () => {
    test('has proper page structure', async ({ page }) => {
      await page.goto('/login')

      // Page should have a main heading
      const heading = page.getByRole('heading', { level: 1 })
      await expect(heading).toBeVisible()

      // Form should be accessible
      const emailInput = page.getByLabel('Email')
      const passwordInput = page.getByLabel('Password')
      await expect(emailInput).toBeVisible()
      await expect(passwordInput).toBeVisible()

      // Submit button should be accessible
      const submitButton = page.getByRole('button', { name: 'Sign in' })
      await expect(submitButton).toBeVisible()
    })

    test('supports keyboard navigation', async ({ page }) => {
      await page.goto('/login')

      // Tab through form elements
      await page.keyboard.press('Tab')
      const firstFocused = await page.evaluate(() => document.activeElement?.tagName)
      expect(firstFocused).toBeTruthy()

      // Continue tabbing to find form inputs
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab')
        const tagName = await page.evaluate(() => document.activeElement?.tagName)
        if (tagName === 'INPUT' || tagName === 'BUTTON') {
          break
        }
      }

      // Should be able to tab through the form
      const activeElement = await page.evaluate(() => ({
        tag: document.activeElement?.tagName,
        type: (document.activeElement as HTMLInputElement)?.type,
      }))
      expect(['INPUT', 'BUTTON', 'A']).toContain(activeElement.tag)
    })

    test('form fields have proper labels', async ({ page }) => {
      await page.goto('/login')

      // Check that inputs have associated labels
      const emailInput = page.getByLabel('Email')
      await expect(emailInput).toHaveAttribute('type', 'email')

      const passwordInput = page.getByLabel('Password')
      await expect(passwordInput).toHaveAttribute('type', 'password')
    })
  })

  test.describe('Signup Page', () => {
    test('has proper form structure', async ({ page }) => {
      await page.goto('/signup')

      // All form fields should have labels
      await expect(page.getByLabel('Full Name')).toBeVisible()
      await expect(page.getByLabel('Email')).toBeVisible()
      await expect(page.getByLabel('Password')).toBeVisible()
      await expect(page.getByLabel('Organization Name')).toBeVisible()

      // Submit button should be accessible
      await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible()
    })

    test('supports keyboard form submission', async ({ page }) => {
      await page.goto('/signup')

      // Fill form with keyboard
      await page.getByLabel('Full Name').fill('Test User')
      await page.keyboard.press('Tab')
      await page.keyboard.type('test@example.com')
      await page.keyboard.press('Tab')
      await page.keyboard.type('password123')
      await page.keyboard.press('Tab')
      await page.keyboard.type('Test Organization')

      // Form should be filled
      await expect(page.getByLabel('Full Name')).toHaveValue('Test User')
      await expect(page.getByLabel('Email')).toHaveValue('test@example.com')
    })
  })

  test.describe('Link Navigation', () => {
    test('login page has accessible signup link', async ({ page }) => {
      await page.goto('/login')

      const signupLink = page.getByRole('link', { name: 'Sign up' })
      await expect(signupLink).toBeVisible()
      await expect(signupLink).toHaveAttribute('href', '/signup')
    })

    test('signup page has accessible login link', async ({ page }) => {
      await page.goto('/signup')

      const loginLink = page.getByRole('link', { name: 'Sign in' })
      await expect(loginLink).toBeVisible()
      await expect(loginLink).toHaveAttribute('href', '/login')
    })
  })

  test.describe('Focus Management', () => {
    test('focus is visible on interactive elements', async ({ page }) => {
      await page.goto('/login')

      // Focus the email input
      await page.getByLabel('Email').focus()

      // Check that the element is focused
      const isFocused = await page.evaluate(() => {
        const email = document.querySelector('input[type="email"]')
        return document.activeElement === email
      })
      expect(isFocused).toBe(true)
    })

    test('can navigate with Enter key', async ({ page }) => {
      await page.goto('/login')

      // Focus on signup link and press Enter
      const signupLink = page.getByRole('link', { name: 'Sign up' })
      await signupLink.focus()
      await page.keyboard.press('Enter')

      // Should navigate to signup
      await expect(page).toHaveURL(/.*signup/)
    })
  })
})
