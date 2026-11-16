// Tasks: quick add, complete, filter.
import { expect, test } from '@playwright/test';
import { openDashboard, toast } from './helpers';

test('add a task, complete it and find it under "Concluídas"', async ({ page }) => {
  await openDashboard(page, '/tarefas');
  await page.getByLabel('Nova tarefa').fill('Comprar papel kraft');
  await page.getByLabel('Nova tarefa').press('Enter');
  await expect(toast(page)).toHaveText('Tarefa adicionada');
  const task = page.locator('[data-task="Comprar papel kraft"]');
  await expect(task).toBeVisible();
  await task.getByRole('button', { name: 'Concluir: Comprar papel kraft' }).click();
  await expect(toast(page)).toHaveText('Tarefa concluída');
  await expect(task).toHaveCount(0); // "Pendentes" hides it
  await page.getByRole('group', { name: 'Mostrar' }).getByRole('button', { name: 'Concluídas' }).click();
  await expect(page.locator('[data-task="Comprar papel kraft"][data-done]')).toBeVisible();
});

test('an empty task is not added', async ({ page }) => {
  await openDashboard(page, '/tarefas');
  const before = await page.locator('[data-task]').count();
  await page.getByRole('button', { name: 'Adicionar' }).click();
  await expect(toast(page)).toHaveText('Escreva a tarefa antes de adicionar.');
  await expect(page.locator('[data-task]')).toHaveCount(before);
});

test('overdue tasks are grouped first', async ({ page }) => {
  await openDashboard(page, '/tarefas');
  await expect(page.locator('[data-group]').first().locator('h2')).toContainText('Atrasadas');
});
