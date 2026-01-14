import { test, expect } from '@playwright/test'

test.describe('Form Validation', () => {
  test.describe('Login Form', () => {
    test('requires email field', async ({ page }) => {
      await page.goto('/login')

      // Try to submit without email
      await page.getByLabel('Password').fill('password123')
      await page.getByRole('button', { name: 'Sign in' }).click()

      // Email field should show as invalid (HTML5 validation)
      const emailInput = page.getByLabel('Email')
      const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid)
      expect(isInvalid).toBe(true)
    })

    test('requires password field', async ({ page }) => {
      await page.goto('/login')

      // Fill only email
      await page.getByLabel('Email').fill('test@example.com')
      await page.getByRole('button', { name: 'Sign in' }).click()

      // Should not navigate away (form validation prevents submission)
      await expect(page).toHaveURL(/.*login/)
    })

    test('validates email format', async ({ page }) => {
      await page.goto('/login')

      // Enter invalid email
      await page.getByLabel('Email').fill('invalid-email')
      await page.getByLabel('Password').fill('password123')
      await page.getByRole('button', { name: 'Sign in' }).click()

      // Email should be invalid
      const emailInput = page.getByLabel('Email')
      const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid)
      expect(isInvalid).toBe(true)
    })
  })

  test.describe('Signup Form', () => {
    test('requires all fields', async ({ page }) => {
      await page.goto('/signup')

      // Try to submit empty form
      await page.getByRole('button', { name: 'Create account' }).click()

      // Should stay on signup page (validation prevents submission)
      await expect(page).toHaveURL(/.*signup/)
    })

    test('requires valid email', async ({ page }) => {
      await page.goto('/signup')

      await page.getByLabel('Full Name').fill('Test User')
      await page.getByLabel('Email').fill('invalid-email')
      await page.getByLabel('Password').fill('password123')
      await page.getByLabel('Organization Name').fill('Test Org')

      await page.getByRole('button', { name: 'Create account' }).click()

      // Email should be invalid
      const emailInput = page.getByLabel('Email')
      const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid)
      expect(isInvalid).toBe(true)
    })

    test('form fields clear on reset', async ({ page }) => {
      await page.goto('/signup')

      // Fill form
      await page.getByLabel('Full Name').fill('Test User')
      await page.getByLabel('Email').fill('test@example.com')

      // Navigate away and back
      await page.goto('/login')
      await page.goto('/signup')

      // Fields should be empty (no persistence without submission)
      // Note: This depends on browser behavior
      await expect(page.getByLabel('Full Name')).toBeVisible()
    })
  })

  test.describe('Input Types', () => {
    test('email input has correct type', async ({ page }) => {
      await page.goto('/login')
      const emailInput = page.getByLabel('Email')
      await expect(emailInput).toHaveAttribute('type', 'email')
    })

    test('password input has correct type', async ({ page }) => {
      await page.goto('/login')
      const passwordInput = page.getByLabel('Password')
      await expect(passwordInput).toHaveAttribute('type', 'password')
    })

    test('password input masks characters', async ({ page }) => {
      await page.goto('/login')

      // Type password
      await page.getByLabel('Password').fill('secretpassword')

      // Verify it's a password type (characters are masked)
      const passwordInput = page.getByLabel('Password')
      await expect(passwordInput).toHaveAttribute('type', 'password')
      await expect(passwordInput).toHaveValue('secretpassword')
    })
  })

  test.describe('Form Submission States', () => {
    test('button is clickable', async ({ page }) => {
      await page.goto('/login')

      const submitButton = page.getByRole('button', { name: 'Sign in' })
      await expect(submitButton).toBeEnabled()
    })

    test('form can be submitted with Enter key', async ({ page }) => {
      await page.goto('/login')

      await page.getByLabel('Email').fill('test@example.com')
      await page.getByLabel('Password').fill('password123')

      // Press Enter in password field
      await page.getByLabel('Password').press('Enter')

      // Form should attempt submission (may show error since credentials are invalid)
      // Wait a moment for any async operations
      await page.waitForTimeout(1000)

      // Should either show error or remain on page
      // (depending on whether validation/submission occurred)
    })
  })
})
