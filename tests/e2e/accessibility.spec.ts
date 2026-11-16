// Keyboard and screen-reader behavior: dialogs, focus, tooltips and text alternatives.
import { expect, test } from '@playwright/test';
import { heading, openDashboard, sidebar } from './helpers';

test('a form dialog takes focus, blocks the page behind it and gives focus back on Escape', async ({ page }) => {
  await openDashboard(page, '/pedidos');
  const opener = page.getByRole('main').getByRole('button', { name: 'Novo pedido' });
  await opener.focus();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog', { name: 'Novo pedido' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Data')).toBeFocused();
  // A modal <dialog>: everything behind it is inert.
  expect(await dialog.evaluate(d => d.matches(':modal'))).toBe(true);

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('changing screens moves focus to the new page title', async ({ page }) => {
  await openDashboard(page);
  await sidebar(page).getByRole('link', { name: 'Insumos' }).click();
  await expect(heading(page)).toHaveText('Insumos');
  await expect(heading(page)).toBeFocused();
});

test('stat card explanations show on keyboard focus and are read by screen readers', async ({ page }) => {
  await openDashboard(page);
  const trigger = page.locator('[aria-describedby]', { has: page.locator('[data-kpi="Lucro do mês"]') });
  // Closed, the explanation is only for screen readers (visually hidden).
  await expect(trigger).toHaveAccessibleDescription(/custo das peças vendidas/);
  await expect(trigger.getByRole('tooltip')).toHaveClass('sr-only');
  await trigger.focus();
  await expect(trigger.getByRole('tooltip')).not.toHaveClass('sr-only');
  await expect(trigger.getByRole('tooltip')).toContainText('Lucro do mês');
});

test('the chart has a text alternative with each month', async ({ page }) => {
  await openDashboard(page);
  const label = await page.getByRole('img', { name: /Vendas e gastos por mês/ }).getAttribute('aria-label');
  expect(label).toContain('outubro de 2026: vendas');
  expect(label).toContain('maio de 2026');
});

test('a skip link jumps to the content', async ({ page }) => {
  await openDashboard(page);
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
});

test('a product image that fails to load falls back to its initial', async ({ page }) => {
  await openDashboard(page, '/precos');
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('painel-lojinha-demo')!);
    db.produtos[0].imagem = 'data:image/png;base64,broken';
    localStorage.setItem('painel-lojinha-demo', JSON.stringify(db));
  });
  await page.reload();
  const avatar = page.locator('main [data-avatar]').first();
  await expect(avatar.locator('img')).toHaveCount(0);
  await expect(avatar).not.toBeEmpty();
});
