// Overview: the month summary, profit card, month picker and product ranking.
import { expect, test } from '@playwright/test';
import { kpiValue, openDashboard } from './helpers';

test.beforeEach(async ({ page }) => {
  await openDashboard(page);
});

const monthButton = (page: import('@playwright/test').Page) => page.getByRole('button', { name: /de 2026/ });

test('opens in demo mode on the current month with sample data', async ({ page }) => {
  await expect(page.getByText('Modo demonstração')).toBeVisible();
  await expect(monthButton(page)).toContainText('outubro de 2026');
  await expect(page.locator('[data-alert]').first()).toBeVisible(); // "Precisa de atenção" has items
});

test('shows the monthly profit with its calculation', async ({ page }) => {
  const card = page.locator('[data-kpi="Lucro do mês"]');
  await expect(card).toContainText('Lucro do mês');
  await expect(kpiValue(page, 'Lucro do mês')).toHaveText(/413,56/);
  await expect(card).toContainText('margem 69,6%');
  await expect(card.locator('[data-calc]')).toContainText('vendas');
  await expect(kpiValue(page, 'Vendas')).toHaveText(/594,50/);
  await expect(page.locator('[data-kpi="Caixa do mês"]')).toBeVisible();
});

test('the month picker changes the period and goes back to today', async ({ page }) => {
  await page.getByRole('button', { name: 'Mês anterior' }).click();
  await expect(monthButton(page)).toContainText('setembro de 2026');
  await expect(kpiValue(page, 'Lucro do mês')).toHaveText(/149,41/);
  await monthButton(page).click(); // "voltar para hoje"
  await expect(monthButton(page)).toContainText('outubro de 2026');
});

test('the product ranking switches between profit and pieces', async ({ page }) => {
  const rows = page.locator('[data-rank] > span:first-child');
  await expect(rows.first()).toHaveText('Botton Gatinho Lunar 38mm');
  await expect(rows.nth(1)).toHaveText('Chaveiro acrílico Sapinho'); // 2nd in profit
  await page.getByRole('group', { name: 'Ordenar produtos' }).getByRole('button', { name: 'Peças' }).click();
  await expect(rows.nth(1)).toHaveText('Marcador de página Cogumelos'); // 2nd in pieces
});

test('a shortcut opens the matching form', async ({ page }) => {
  await page
    .getByRole('navigation', { name: 'Ações rápidas' })
    .getByRole('button', { name: /Novo gasto/ })
    .click();
  await expect(page.getByRole('dialog', { name: 'Novo gasto' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
