import { expect, test } from '@playwright/test';

async function registerNewOrg(page: import('@playwright/test').Page) {
  const unique = Date.now();
  const email = `e2e-tickets-${unique}@opsflow.test`;

  await page.goto('/register');
  await page.getByLabel('Organization name').fill(`Tickets E2E ${unique}`);
  await page.getByLabel('First name').fill('Grace');
  await page.getByLabel('Last name').fill('Hopper');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('correct-horse-battery-staple');
  await page.getByRole('button', { name: 'Create organization' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe('tickets', () => {
  test('a user can create a ticket, see it listed, and resolve it', async ({ page }) => {
    await registerNewOrg(page);

    const ticketTitle = `Payment gateway down ${Date.now()}`;

    await page.goto('/tickets');
    await page.getByRole('button', { name: 'New ticket' }).click();
    await page.getByLabel('Title').fill(ticketTitle);
    await page.getByLabel('Description').fill('Customers cannot complete checkout since 10:00 UTC.');
    await page.getByLabel('Priority').click();
    await page.getByRole('option', { name: 'CRITICAL' }).click();
    await page.getByRole('button', { name: 'Create ticket' }).click();

    await expect(page.getByRole('link', { name: ticketTitle })).toBeVisible();

    await page.getByRole('link', { name: ticketTitle }).click();
    await expect(page.getByRole('heading', { name: ticketTitle })).toBeVisible();

    await page.getByRole('button', { name: 'Mark as resolved' }).click();
    await expect(page.getByTestId('ticket-status-badge')).toHaveText('RESOLVED');

    await expect(page.getByText(/ticket status changed/i)).toBeVisible();
  });
});
