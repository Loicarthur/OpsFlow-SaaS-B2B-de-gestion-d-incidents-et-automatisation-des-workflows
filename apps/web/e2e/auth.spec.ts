import { expect, test } from '@playwright/test';

test.describe('authentication', () => {
  test('a new user can register an organization, sign out and sign back in', async ({ page }) => {
    const unique = Date.now();
    const email = `e2e-${unique}@opsflow.test`;
    const organizationName = `E2E Org ${unique}`;

    await page.goto('/register');
    await page.getByLabel('Organization name').fill(organizationName);
    await page.getByLabel('First name').fill('Ada');
    await page.getByLabel('Last name').fill('Lovelace');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('correct-horse-battery-staple');
    await page.getByRole('button', { name: 'Create organization' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText(organizationName)).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('correct-horse-battery-staple');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('rejects an invalid login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('nobody@opsflow.test');
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
