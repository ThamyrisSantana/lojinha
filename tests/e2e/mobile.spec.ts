// Phone layout (Pixel 7): bottom navigation, slide-out menu and the quick theme button.
import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, heading, openDashboard, sidebar } from './helpers';

test.beforeEach(async ({ page }) => {
  await openDashboard(page);
});

const bottomBar = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Atalhos' });
const menu = (page: import('@playwright/test').Page) => page.getByRole('complementary', { name: 'Menu' });

test('the bottom bar replaces the sidebar', async ({ page }) => {
  await expect(bottomBar(page)).toBeVisible();
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(menu(page)).not.toBeInViewport();
  await bottomBar(page).getByRole('link', { name: 'Pedidos' }).click();
  await expect(heading(page)).toHaveText('Pedidos');
  await expect(page.getByRole('banner')).toContainText('Pedidos');
});

test('"Mais" opens the full menu and a screen closes it', async ({ page }) => {
  await bottomBar(page)
    .getByRole('button', { name: /abrir menu/i })
    .click();
  await expect(menu(page)).toBeInViewport();
  await sidebar(page).getByRole('link', { name: 'Insumos' }).click();
  await expect(heading(page)).toHaveText('Insumos');
  await expect(menu(page)).not.toBeInViewport();
});

test('the menu takes focus, closes with Escape and is skipped by Tab while closed', async ({ page }) => {
  // Closed: its links are not reachable.
  await expect(sidebar(page).getByRole('link', { name: 'Insumos' })).toBeHidden();
  await bottomBar(page)
    .getByRole('button', { name: /abrir menu/i })
    .click();
  await expect(sidebar(page).getByRole('link').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu(page)).not.toBeInViewport();
  await expect(sidebar(page).getByRole('link', { name: 'Insumos' })).toBeHidden();
});

test('the phone layout, closed and with the menu open, has no axe violations', async ({ page }) => {
  await expectNoAxeViolations(page, 'phone, menu closed');
  await bottomBar(page)
    .getByRole('button', { name: /abrir menu/i })
    .click();
  await expect(sidebar(page).getByRole('link').first()).toBeFocused();
  await expectNoAxeViolations(page, 'phone, menu open');
});

test('the page never scrolls sideways', async ({ page }) => {
  for (const path of ['/', '/catalogo', '/tarefas']) {
    await page.goto(`/#${path}`);
    await expect(heading(page)).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test('the top bar button switches the theme', async ({ page }) => {
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Usar tema claro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('a task can be dragged with a finger', async ({ page }) => {
  await page.goto('/#/tarefas');
  const group = page.locator('[data-group="Atrasadas"]');
  const titles = () => group.locator('[data-task]').evaluateAll(els => els.map(e => (e as HTMLElement).dataset.task));
  await expect(group.locator('[data-task]')).toHaveCount(3);
  const [first, second, third] = await titles();
  await group.locator(`[data-task="${third}"]`).scrollIntoViewIfNeeded();
  const from = (await group.getByRole('button', { name: `Mover: ${first}` }).boundingBox())!;
  const to = (await group.locator(`[data-task="${third}"]`).boundingBox())!;
  // Real touch events (Chrome DevTools Protocol), so the handle's touch-action is exercised too.
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: string, y: number) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: from.x + from.width / 2, y }] });
  await touch('touchStart', from.y + from.height / 2);
  for (let i = 1; i <= 12; i++)
    await touch('touchMove', from.y + from.height / 2 + ((to.y + to.height - 5 - from.y - from.height / 2) * i) / 12);
  await touch('touchEnd', 0);
  await expect.poll(titles).toEqual([second, third, first]);
});
