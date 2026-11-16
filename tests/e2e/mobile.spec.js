// Phone layout (Pixel 7): bottom navigation, slide-out menu and the quick theme button.
const { test, expect } = require('@playwright/test');
const { openDashboard } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await openDashboard(page);
});

test('the bottom bar replaces the sidebar', async ({ page }) => {
  await expect(page.locator('#bnav')).toBeVisible();
  await expect(page.locator('.mtop')).toBeVisible();
  await expect(page.locator('#side')).not.toBeInViewport();
  await page.locator('#bnav').getByRole('button', { name: 'Pedidos' }).click();
  await expect(page.locator('#view .head h1')).toHaveText('Pedidos');
  await expect(page.locator('#mTitle')).toHaveText('Pedidos');
});

test('"Mais" opens the full menu and a screen closes it', async ({ page }) => {
  await page
    .locator('#bnav')
    .getByRole('button', { name: /Abrir menu/ })
    .click();
  await expect(page.locator('#side')).toBeInViewport();
  await page.locator('#nav').getByRole('button', { name: 'Insumos' }).click();
  await expect(page.locator('#view .head h1')).toHaveText('Insumos');
  await expect(page.locator('#side')).not.toBeInViewport();
});

test('the page never scrolls sideways', async ({ page }) => {
  for (const tab of ['visao', 'catalogo', 'tarefas']) {
    await page.goto(`/#${tab}`);
    await page.reload();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, tab).toBeLessThanOrEqual(0);
  }
});

test('the top bar button switches the theme', async ({ page }) => {
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Usar tema claro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
