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

const overdue = (page: import('@playwright/test').Page) => page.locator('[data-group="Atrasadas"]');
const titles = (page: import('@playwright/test').Page) =>
  overdue(page)
    .locator('[data-task]')
    .evaluateAll(els => els.map(e => (e as HTMLElement).dataset.task));

test('tasks can be put in order with the arrow keys, and the order is kept', async ({ page }) => {
  await openDashboard(page, '/tarefas');
  await expect(overdue(page).locator('[data-task]')).toHaveCount(3);
  const [first, second, third] = await titles(page);
  const handle = overdue(page).getByRole('button', { name: `Mover: ${third}` });
  await handle.focus();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await expect.poll(() => titles(page)).toEqual([third, first, second]);
  // Focus stays on the moved task, and screen readers hear where it went.
  await expect(handle).toBeFocused();
  await expect(overdue(page).locator('[aria-live="polite"]')).toHaveText(`Tarefa ${third} movida para a posição 1 de 3.`);
  await page.keyboard.press('End');
  await expect.poll(() => titles(page)).toEqual([first, second, third]);
  await page.keyboard.press('Home');
  await page.reload();
  await expect.poll(() => titles(page)).toEqual([third, first, second]);
});

test('a task can be dragged to a new place', async ({ page }) => {
  await openDashboard(page, '/tarefas');
  await expect(overdue(page).locator('[data-task]')).toHaveCount(3);
  const [first, second, third] = await titles(page);
  const from = (await overdue(page)
    .getByRole('button', { name: `Mover: ${first}` })
    .boundingBox())!;
  const to = (await overdue(page).locator(`[data-task="${third}"]`).boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2, to.y + to.height - 5, { steps: 12 });
  await page.mouse.up();
  await expect.poll(() => titles(page)).toEqual([second, third, first]);
  await page.reload();
  await expect.poll(() => titles(page)).toEqual([second, third, first]);
});

test('completed tasks have no move handle', async ({ page }) => {
  await openDashboard(page, '/tarefas?filtro=feitas');
  await expect(page.locator('[data-task][data-done]').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^Mover:/ })).toHaveCount(0);
});
