// Tasks: quick add, complete, filter.
const { test, expect } = require('@playwright/test');
const { openDashboard, toast } = require('./helpers');

test('add a task, complete it and find it under "Concluídas"', async ({ page }) => {
  await openDashboard(page, 'tarefas');
  await page.locator('#tq-titulo').fill('Comprar papel kraft');
  await page.locator('#tq-titulo').press('Enter');
  await expect(toast(page)).toHaveText('Tarefa adicionada');

  const task = page.locator('.task', { hasText: 'Comprar papel kraft' });
  await expect(task).toBeVisible();
  await task.getByRole('button', { name: 'Concluir: Comprar papel kraft' }).click();
  await expect(toast(page)).toHaveText('Tarefa concluída');
  await expect(task).toHaveCount(0); // "Pendentes" hides it

  await page.getByRole('group', { name: 'Mostrar' }).getByRole('button', { name: 'Concluídas' }).click();
  await expect(page.locator('.task.done', { hasText: 'Comprar papel kraft' })).toBeVisible();
});

test('an empty task is not added', async ({ page }) => {
  await openDashboard(page, 'tarefas');
  const before = await page.locator('.task').count();
  await page.getByRole('button', { name: 'Adicionar' }).click();
  await expect(toast(page)).toHaveText('Escreva a tarefa antes de adicionar.');
  await expect(page.locator('.task')).toHaveCount(before);
});

test('overdue tasks are grouped first', async ({ page }) => {
  await openDashboard(page, 'tarefas');
  await expect(page.locator('.tgroup').first().locator('h2')).toContainText('Atrasadas');
});
