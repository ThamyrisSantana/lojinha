// Overview: the month summary, profit card, month picker and product ranking.
const { test, expect } = require('@playwright/test');
const { salesCard, openDashboard } = require('./helpers');

test.beforeEach(async ({ page }) => { await openDashboard(page); });

test('opens in demo mode on the current month with sample data', async ({ page }) => {
  await expect(page.locator('#demoBar')).toBeVisible();
  await expect(page.locator('.month-l')).toContainText('outubro de 2026');
  await expect(page.locator('.alert').first()).toBeVisible(); // "Precisa de atenção" has items
});

test('shows the monthly profit with its calculation', async ({ page }) => {
  const card = page.locator('.kpi.feat');
  await expect(card).toContainText('Lucro do mês');
  await expect(card.locator('b')).toHaveText(/413,56/);
  await expect(card).toContainText('margem 69,6%');
  await expect(card.locator('small.calc')).toContainText('vendas');
  await expect(salesCard(page)).toHaveText(/594,50/);
  await expect(page.locator('.kpi', { hasText: 'Caixa do mês' })).toBeVisible();
});

test('the month picker changes the period and goes back to today', async ({ page }) => {
  await page.getByRole('button', { name: 'Mês anterior' }).click();
  await expect(page.locator('.month-l')).toContainText('setembro de 2026');
  await expect(page.locator('.kpi.feat b')).toHaveText(/149,41/);
  await page.locator('button.month-l').click(); // "voltar para hoje"
  await expect(page.locator('.month-l')).toContainText('outubro de 2026');
});

test('the product ranking switches between profit and pieces', async ({ page }) => {
  const rows = page.locator('.hbar.rank .nm .t');
  await expect(rows.first()).toHaveText('Botton Gatinho Lunar 38mm');
  await expect(rows.nth(1)).toHaveText('Chaveiro acrílico Sapinho'); // 2nd in profit
  await page.getByRole('group', { name: 'Ordenar produtos' }).getByRole('button', { name: 'Peças' }).click();
  await expect(rows.nth(1)).toHaveText('Marcador de página Cogumelos'); // 2nd in pieces
});

test('a shortcut opens the matching form', async ({ page }) => {
  await page.locator('.qa', { hasText: 'Novo gasto' }).click();
  await expect(page.getByRole('dialog', { name: 'Novo gasto' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
