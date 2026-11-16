// Orders: create one, see it in the list and in the overview, change its status, delete it.
const { test, expect } = require('@playwright/test');
const { salesCard, openDashboard, goTo, toast } = require('./helpers');

async function createOrder(page, { numero, product, qty }) {
  await page.getByRole('button', { name: 'Novo pedido' }).click();
  const form = page.getByRole('dialog', { name: 'Novo pedido' });
  await form.locator('#f-numero').fill(numero);
  await form.locator('#f-canal').fill('Instagram');
  await form.locator('#f-cliente').fill('Cliente Teste');
  const row = form.locator('[data-row="ped"]').first();
  await row.locator('select[data-f="produtoId"]').selectOption({ label: product }); // fills the unit price
  await row.locator('input[data-f="qtd"]').fill(String(qty));
  await expect(row.locator('input[data-f="preco"]')).not.toHaveValue('');
  await form.getByRole('button', { name: 'Salvar' }).click();
  await expect(toast(page)).toHaveText('Salvo');
  await expect(form).toHaveCount(0);
}

test('a new order shows up in the list and raises the month sales', async ({ page }) => {
  await openDashboard(page, 'pedidos');
  await createOrder(page, { numero: '2001', product: 'Botton Gatinho Lunar 38mm', qty: 2 });
  const row = page.locator('tbody tr', { hasText: '#2001' });
  await expect(row).toContainText('Cliente Teste');
  await expect(row).toContainText('2× Botton Gatinho Lunar 38mm');
  await expect(row).toContainText('17,80'); // 2 × R$ 8,90

  await goTo(page, 'Visão geral');
  await expect(salesCard(page)).toHaveText(/612,30/); // 594,50 + 17,80
  await expect(page.locator('.alert', { hasText: 'Pedido #2001' })).toBeVisible(); // new order needs attention
});

test('changing the status from the list saves it', async ({ page }) => {
  await openDashboard(page, 'pedidos');
  await createOrder(page, { numero: '2002', product: 'Chaveiro acrílico Sapinho', qty: 1 });
  await page.locator('tbody tr', { hasText: '#2002' }).locator('select[data-act="status"]').selectOption('enviado');
  await expect(toast(page)).toHaveText('Status: Enviado');
});

test('deleting an order asks for confirmation first', async ({ page }) => {
  await openDashboard(page, 'pedidos');
  await createOrder(page, { numero: '2003', product: 'Print A5 Floresta Encantada', qty: 1 });
  await page.locator('tbody tr', { hasText: '#2003' }).getByRole('button', { name: 'Editar' }).click();
  const remove = page.getByRole('dialog').getByRole('button', { name: 'Excluir' });
  await remove.click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Confirmar exclusão' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar exclusão' }).click();
  await expect(toast(page)).toHaveText('Excluído');
  await expect(page.locator('tbody tr', { hasText: '#2003' })).toHaveCount(0);
});

test('data is kept after reloading (demo mode saves in the browser)', async ({ page }) => {
  await openDashboard(page, 'pedidos');
  await createOrder(page, { numero: '2004', product: 'Botton Gatinho Lunar 38mm', qty: 1 });
  await page.reload();
  await expect(page.locator('tbody tr', { hasText: '#2004' })).toBeVisible();
});
