import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/.*login/)
  })

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login')

    // Check page title
    await expect(page.getByRole('heading', { name: 'Landlord' })).toBeVisible()
    await expect(page.getByText('Sign in to your account')).toBeVisible()

    // Check form fields
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()

    // Check signup link
    await expect(page.getByRole('link', { name: 'Sign up' })).toBeVisible()
  })

  test('signup page renders correctly', async ({ page }) => {
    await page.goto('/signup')

    // Check page title
    await expect(page.getByRole('heading', { name: 'Landlord' })).toBeVisible()
    await expect(page.getByText('Create your account')).toBeVisible()

    // Check form fields
    await expect(page.getByLabel('Full Name')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByLabel('Organization Name')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible()

    // Check login link
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()
  })

  test('can navigate between login and signup', async ({ page }) => {
    await page.goto('/login')

    // Click signup link
    await page.getByRole('link', { name: 'Sign up' }).click()
    await expect(page).toHaveURL(/.*signup/)

    // Click login link
    await page.getByRole('link', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/.*login/)
  })

  test('shows error for invalid login', async ({ page }) => {
    await page.goto('/login')

    // Enter invalid credentials
    await page.getByLabel('Email').fill('invalid@example.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign in' }).click()

    // Should show error message
    await expect(page.getByText(/invalid|error|incorrect/i)).toBeVisible({ timeout: 10000 })
  })
})
