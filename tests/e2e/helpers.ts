// Shared steps for the end-to-end tests.
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

// The sample data (exemplo.json) covers August–October 2026, so the clock is fixed on
// 20 October 2026: the overview opens on a month with sales and the tests never age.
export const FIXED_NOW = new Date('2026-10-20T12:00:00-03:00');

/** Opens a screen ('/', '/pedidos'…) in demo mode with the clock fixed. */
export async function openDashboard(page: Page, path = '/') {
  await page.clock.setFixedTime(FIXED_NOW);
  await page.goto(`/#${path}`);
  await expect(page.locator('main h1')).toBeVisible();
}

export const sidebar = (page: Page) => page.getByRole('navigation', { name: 'Seções' });

/** Goes to a screen through the sidebar. */
export async function goTo(page: Page, label: string) {
  await sidebar(page).getByRole('link', { name: label }).click();
}

export const heading = (page: Page) => page.locator('main h1');
/** Value of a stat card ("Vendas", "Lucro do mês"…). */
export const kpiValue = (page: Page, label: string) => page.locator(`[data-kpi="${label}"] b`);
/** The confirmation toast shown after saving. */
export const toast = (page: Page) => page.getByTestId('toast');

/** Runs axe (WCAG 2.2 A/AA rules) on the page and fails with a readable list of the problems found. */
export async function expectNoAxeViolations(page: Page, label: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const report = violations.map(v => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map(n => n.target.join(' ')).join('\n  ')}`);
  expect(report, label).toEqual([]);
}
