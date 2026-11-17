// Orders: create one, see it in the list and in the overview, change its status, delete it.
import { expect, test, type Page } from '@playwright/test';
import { goTo, kpiValue, openDashboard, toast } from './helpers';

async function createOrder(page: Page, { numero, product, qty }: { numero: string; product: string; qty: number }) {
  await page.getByRole('button', { name: 'Novo pedido' }).click();
  const form = page.getByRole('dialog', { name: 'Novo pedido' });
  await form.getByLabel('Número do pedido', { exact: true }).fill(numero);
  await form.getByLabel('Canal de venda').fill('Instagram');
  await form.getByLabel('Cliente', { exact: true }).fill('Cliente Teste');
  const row = form.locator('[data-row="item"]').first();
  await row.getByLabel('Produto').selectOption({ label: product }); // fills the unit price
  await row.getByLabel('Qtd').fill(String(qty));
  await expect(row.getByLabel('Preço un. (R$)')).not.toHaveValue('');
  await form.getByRole('button', { name: 'Salvar' }).click();
  await expect(toast(page)).toHaveText('Salvo');
  await expect(form).toHaveCount(0);
}

test('a new order shows up in the list and raises the month sales', async ({ page }) => {
  await openDashboard(page, '/pedidos');
  await createOrder(page, { numero: '2001', product: 'Botton Gatinho Lunar 38mm', qty: 2 });
  const row = page.locator('tbody tr', { hasText: '#2001' });
  await expect(row).toContainText('Cliente Teste');
  await expect(row).toContainText('2× Botton Gatinho Lunar 38mm');
  await expect(row).toContainText('17,80'); // 2 × R$ 8,90
  await goTo(page, 'Visão geral');
  await expect(kpiValue(page, 'Vendas')).toHaveText(/612,30/); // 594,50 + 17,80
  await expect(page.locator('[data-alert]', { hasText: 'Pedido #2001' })).toBeVisible(); // new order needs attention
});

test('a form shows what is wrong instead of saving', async ({ page }) => {
  await openDashboard(page, '/pedidos');
  await page.getByRole('button', { name: 'Novo pedido' }).click();
  const form = page.getByRole('dialog', { name: 'Novo pedido' });
  await form.getByLabel('Desconto (R$)').fill('dez');
  await form.getByRole('button', { name: 'Salvar' }).click();
  await expect(form.getByText('Digite só números (ex.: 12,50).')).toBeVisible();
  await expect(form.getByLabel('Desconto (R$)')).toHaveAttribute('aria-invalid', 'true');
  await expect(form).toBeVisible();
});

test('changing the status from the list saves it', async ({ page }) => {
  await openDashboard(page, '/pedidos');
  await createOrder(page, { numero: '2002', product: 'Chaveiro acrílico Sapinho', qty: 1 });
  await page.getByLabel('Status do pedido #2002').selectOption('enviado');
  await expect(toast(page)).toHaveText('Status: Enviado');
});

test('deleting an order asks for confirmation first', async ({ page }) => {
  await openDashboard(page, '/pedidos');
  await createOrder(page, { numero: '2003', product: 'Print A5 Floresta Encantada', qty: 1 });
  await page.locator('tbody tr', { hasText: '#2003' }).getByRole('button', { name: 'Editar' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Excluir' }).click();
  await dialog.getByRole('button', { name: 'Confirmar exclusão' }).click();
  await expect(toast(page)).toHaveText('Excluído');
  await expect(page.locator('tbody tr', { hasText: '#2003' })).toHaveCount(0);
});

test('data is kept after reloading (demo mode saves in the browser)', async ({ page }) => {
  await openDashboard(page, '/pedidos');
  await createOrder(page, { numero: '2004', product: 'Botton Gatinho Lunar 38mm', qty: 1 });
  await page.reload();
  await expect(page.locator('tbody tr', { hasText: '#2004' })).toBeVisible();
});
