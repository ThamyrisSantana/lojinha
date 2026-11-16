// Shared steps for the end-to-end tests.
const { expect } = require('@playwright/test');

// The sample data (exemplo.json) covers August–October 2026, so the clock is fixed on
// 20 October 2026: the overview opens on a month with sales and the tests never age.
const FIXED_NOW = new Date('2026-10-20T12:00:00-03:00');

// Opens a screen of the dashboard in demo mode with the clock fixed.
async function openDashboard(page, tab = 'visao') {
  await page.clock.setFixedTime(FIXED_NOW);
  await page.goto(`/#${tab}`);
  await expect(page.locator('#view .head h1')).toBeVisible();
}

// Goes to a screen through the sidebar.
async function goTo(page, label) {
  await page.locator('#nav').getByRole('button', { name: label, exact: false }).first().click();
}

// Value of the "Vendas" stat card (the profit card also mentions sales, so match the label exactly).
const salesCard = page => page.locator('.kpi', { has: page.locator('span', { hasText: /^Vendas$/ }) }).locator('b');

// The confirmation toast shown after saving.
const toast = page => page.locator('#toast');

module.exports = { FIXED_NOW, openDashboard, goTo, toast, salesCard };
