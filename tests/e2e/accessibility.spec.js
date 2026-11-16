// Keyboard and screen-reader behavior: dialogs, focus, tooltips and text alternatives.
const { test, expect } = require('@playwright/test');
const { openDashboard } = require('./helpers');

test('a form dialog takes focus, blocks the page behind it and gives focus back on Escape', async ({ page }) => {
  await openDashboard(page, 'pedidos');
  const opener = page.locator('#view .head').getByRole('button', { name: 'Novo pedido' });
  await opener.focus();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog', { name: 'Novo pedido' });
  await expect(dialog).toBeVisible();
  await expect(page.locator('#f-data')).toBeFocused();
  await expect(page.locator('#app')).toHaveJSProperty('inert', true);

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('#app')).toHaveJSProperty('inert', false);
  await expect(opener).toBeFocused();
});

test('changing screens moves focus to the new page title', async ({ page }) => {
  await openDashboard(page);
  await page.locator('#nav').getByRole('button', { name: 'Insumos' }).click();
  await expect(page.locator('#view h1')).toHaveText('Insumos');
  await expect(page.locator('#view h1')).toBeFocused();
});

test('stat card explanations show on keyboard focus too', async ({ page }) => {
  await openDashboard(page);
  await page.locator('.kpi.feat').focus();
  await expect(page.locator('#tip')).toBeVisible();
  await expect(page.locator('#tip')).toContainText('Lucro do mês');
  // The same explanation is in the card's text for screen readers.
  await expect(page.locator('.kpi.feat .sr-only')).toContainText('custo das peças vendidas');
});

test('the chart has a text alternative with each month', async ({ page }) => {
  await openDashboard(page);
  const label = await page.locator('svg.chart').getAttribute('aria-label');
  expect(label).toContain('outubro de 2026: vendas');
  expect(label).toContain('maio de 2026');
});

test('a skip link jumps to the content', async ({ page }) => {
  await openDashboard(page);
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
});

test('a product image that fails to load falls back to its initial', async ({ page }) => {
  await openDashboard(page, 'preco');
  await page.evaluate(async () => {
    const p = S.produtos[0];
    await save('produtos', p.id, { ...p, imagem: 'data:image/png;base64,broken' });
  });
  await expect(page.locator('#view .pimg').first().locator('img')).toHaveCount(0);
  await expect(page.locator('#view .pimg').first()).not.toBeEmpty();
});
