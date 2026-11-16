// Automated accessibility audit (axe) of every whole screen, in both themes, plus an open form.
// Storybook checks each component alone; this checks them put together (headings, landmarks,
// duplicate ids, contrast against the real backgrounds).
import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, openDashboard } from './helpers';

const SCREENS = ['/', '/tarefas', '/pedidos', '/catalogo', '/precos', '/producao', '/insumos', '/gastos', '/ajustes'];

for (const theme of ['dark', 'light'] as const) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(t => localStorage.setItem('painel-tema', t), theme);
    });

    for (const path of SCREENS) {
      test(`screen ${path} has no axe violations`, async ({ page }) => {
        await openDashboard(page, path);
        await expectNoAxeViolations(page, `${path} (${theme})`);
      });
    }

    test('an open form has no axe violations', async ({ page }) => {
      await openDashboard(page, '/precos');
      await page.getByRole('main').getByRole('button', { name: 'Novo produto' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expectNoAxeViolations(page, `product form (${theme})`);
    });
  });
}
