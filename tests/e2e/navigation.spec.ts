// Every screen opens from the sidebar, shows its title and is reachable by its address.
import { expect, test } from '@playwright/test';
import { goTo, heading, openDashboard, sidebar } from './helpers';

const SCREENS = [
  ['Tarefas', '/tarefas', 'Lista de tarefas'],
  ['Pedidos', '/pedidos', 'Pedidos'],
  ['Catálogo', '/catalogo', 'Catálogo & impressão'],
  ['Preços', '/precos', 'Precificação'],
  ['Produção', '/producao', 'Produção'],
  ['Insumos', '/insumos', 'Insumos'],
  ['Gastos', '/gastos', 'Gastos'],
  ['Ajustes', '/ajustes', 'Ajustes'],
  ['Visão geral', '/', 'Como a lojinha está indo'],
];

test('every screen opens from the sidebar', async ({ page }) => {
  await openDashboard(page);
  for (const [label, path, title] of SCREENS) {
    await goTo(page, label);
    await expect(heading(page), label).toHaveText(title);
    await expect(page).toHaveURL(new RegExp(`#${path.replace('/', '\\/')}$`));
    await expect(sidebar(page).locator('[aria-current="page"]')).toContainText(label);
  }
});

test('a screen opens directly from its address', async ({ page }) => {
  await openDashboard(page, '/insumos');
  await expect(heading(page)).toHaveText('Insumos');
  await expect(page.locator('table tbody tr').first()).toBeVisible();
});

test('the browser tab title follows the screen', async ({ page }) => {
  await openDashboard(page, '/gastos');
  await expect(page).toHaveTitle(/^Gastos · /);
});

test('filters live in the address and survive a reload', async ({ page }) => {
  await openDashboard(page, '/pedidos');
  await page.getByLabel('Filtrar status').selectOption('entregue');
  await expect(page).toHaveURL(/status=entregue/);
  await page.reload();
  await expect(page.getByLabel('Filtrar status')).toHaveValue('entregue');
});
