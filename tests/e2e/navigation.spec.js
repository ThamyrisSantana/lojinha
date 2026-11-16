// Every screen opens from the sidebar, shows its title and is reachable by its address.
const { test, expect } = require('@playwright/test');
const { openDashboard, goTo } = require('./helpers');

const SCREENS = [
  ['Tarefas', 'tarefas', 'Lista de tarefas'],
  ['Pedidos', 'pedidos', 'Pedidos'],
  ['Catálogo', 'catalogo', 'Catálogo & impressão'],
  ['Preços', 'preco', 'Precificação'],
  ['Produção', 'producao', 'Produção'],
  ['Insumos', 'insumos', 'Insumos'],
  ['Gastos', 'gastos', 'Gastos'],
  ['Ajustes', 'ajustes', 'Ajustes'],
  ['Visão geral', 'visao', 'Como a lojinha está indo'],
];

test('every screen opens from the sidebar', async ({ page }) => {
  await openDashboard(page);
  for (const [label, hash, title] of SCREENS) {
    await goTo(page, label);
    await expect(page.locator('#view .head h1'), label).toHaveText(title);
    await expect(page).toHaveURL(new RegExp(`#${hash}$`));
    await expect(page.locator('#nav [aria-current="page"]')).toContainText(label);
  }
});

test('a screen opens directly from its address', async ({ page }) => {
  await openDashboard(page, 'insumos');
  await expect(page.locator('#view .head h1')).toHaveText('Insumos');
  await expect(page.locator('table tbody tr').first()).toBeVisible();
});

test('the browser tab title follows the screen', async ({ page }) => {
  await openDashboard(page, 'gastos');
  await expect(page).toHaveTitle(/^Gastos · /);
});
