// Settings and theme: defaults used in pricing, and the light/dark/auto choice.
const { test, expect } = require('@playwright/test');
const { openDashboard, goTo, toast } = require('./helpers');

test('changing the hourly rate updates the pricing screen', async ({ page }) => {
  await openDashboard(page, 'ajustes');
  await page.locator('#c-vh').fill('40');
  await page.getByRole('button', { name: 'Salvar ajustes' }).click();
  await expect(toast(page)).toHaveText('Ajustes salvos');
  await goTo(page, 'Preços');
  await expect(page.locator('.chips-row')).toContainText('Mão de obra R$ 40,00/h');
});

test('pricing details show the full cost calculation', async ({ page }) => {
  await openDashboard(page, 'preco');
  await page.getByRole('button', { name: 'Detalhes' }).first().click();
  const details = page.locator('tr.detail');
  await expect(details).toContainText('Custo total');
  await expect(details).toContainText('Lucro por peça');
});

test('dark is the default theme and the choice is remembered', async ({ page }) => {
  await openDashboard(page);
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(12, 12, 13)');

  await page.locator('#themeSeg').getByRole('button', { name: 'Claro' }).click();
  await expect(html).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(242, 242, 242)');

  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'light');
});

test('"Automático" follows the device theme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await openDashboard(page, 'ajustes');
  await page.locator('.theme-seg.big').getByRole('button', { name: 'Automático' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(242, 242, 242)');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(12, 12, 13)');
});
